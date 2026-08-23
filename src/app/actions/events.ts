'use server';

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { eventSchema } from "@/lib/validations";
import { sendEventPublishedEmail } from "@/lib/email";
import { verifyAuth } from "@/lib/auth";

export async function createEventInDb(eventData: any, token?: string) {
  try {
    const validatedData = eventSchema.parse(eventData);

    // 1. Ensure the UserProfile exists for the organizer
    const organizerPubkey = validatedData.organizerWallet;

    if (!organizerPubkey) {
      throw new Error("Organizer wallet is required");
    }

    const isAuthorized = await verifyAuth(organizerPubkey, token);
    if (!isAuthorized) throw new Error("Unauthorized");

    await prisma.userProfile.upsert({
      where: { walletPubkey: organizerPubkey },
      update: {},
      create: {
        id: organizerPubkey, // Use pubkey as ID for now if Privy DID is missing
        walletPubkey: organizerPubkey,
        role: "ORGANIZER",
      }
    });

    // 2. Create the Event
    const event = await prisma.event.create({
      data: {
        title: validatedData.name,
        description: validatedData.description,
        collectionMint: validatedData.collectionMint,
        address: validatedData.eventRecordPda,
        escrowVault: eventData.escrowVault,
        organizerPubkey: organizerPubkey,
        status: "PENDING_ON_CHAIN",
        coverImageUrl: validatedData.coverImage,
        ticketImageUrl: validatedData.ticketImage,
        galleryUrls: validatedData.gallery || [],
        location: validatedData.venue,
        countryIso: validatedData.country,
        stateIso: validatedData.state,
        cityName: validatedData.city,
        startDate: validatedData.date && validatedData.time ? new Date(`${validatedData.date}T${validatedData.time}:00`) : null,
        doorTime: validatedData.doorTime,
        ageRestriction: validatedData.ageRestriction,
        category: validatedData.category,
        capacity: validatedData.zones.reduce((acc: number, z: any) => acc + z.capacity, 0),
        ticketPriceSol: validatedData.zones.length > 0 ? validatedData.zones[0].price : 0,
        zones: validatedData.zones as any,
        allowResale: eventData.allowResale || false,
        resaleCapLimit: eventData.resaleCapLimit || null,
        allowRefunds: eventData.allowRefunds || false,
        refundTimeLimit: eventData.refundTimeLimit || null,
        identityLimit: eventData.identityLimit || null,
        isSoulbound: eventData.isSoulbound !== undefined ? eventData.isSoulbound : true,
        lineup: validatedData.lineup || [],
      }
    });

    if (eventData.organizerEmail && validatedData.collectionMint && validatedData.eventRecordPda && eventData.escrowVault) {
      await sendEventPublishedEmail(eventData.organizerEmail, validatedData.name, {
        collectionMint: validatedData.collectionMint,
        eventRecord: validatedData.eventRecordPda,
        escrowVault: eventData.escrowVault,
      });
    }

    revalidatePath('/dashboard');
    return { success: true, eventId: event.id };
  } catch (error: any) {
    console.error("Error creating event in DB:", error);
    return { success: false, error: error.message };
  }
}

export async function getPublishedEvents() {
  try {
    const events = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startDate: {
          gte: new Date() // Only show future events
        }
      },
      orderBy: {
        lastUpdatedAt: "desc"
      },
      include: {
        userProfile: {
          select: {
            companyName: true,
            logoUrl: true
          }
        }
      }
    });
    return events;
  } catch (error) {
    console.error("Error fetching published events:", error);
    return [];
  }
}

export async function getEventById(id: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        tickets: { select: { mintAddress: true } },
        userProfile: {
          select: {
            companyName: true,
            logoUrl: true,
            contactEmail: true
          }
        }
      }
    });
    return event;
  } catch (error) {
    console.error("Error fetching event by ID:", error);
    return null;
  }
}

export async function getEventsByOrganizer(pubkey: string, token?: string) {
  try {
    const isAuthorized = await verifyAuth(pubkey, token);
    if (!isAuthorized) throw new Error("Unauthorized");

    const events = await prisma.event.findMany({
      where: {
        organizerPubkey: pubkey
      },
      orderBy: {
        lastUpdatedAt: "desc"
      }
    });
    return events;
  } catch (error) {
    console.error("Error fetching events by organizer:", error);
    return [];
  }
}

export async function getEventByStaffToken(token: string) {
  try {
    const staffLink = await prisma.staffAccessLink.findUnique({
      where: { token, status: "ACTIVE" },
      include: {
        event: true
      }
    });

    if (!staffLink || !staffLink.event) {
      return null;
    }

    return staffLink.event;
  } catch (error) {
    console.error("Error validating staff token:", error);
    return null;
  }
}

export async function getOrganizerEventStats(pubkey: string, token?: string) {
  try {
    const isAuthorized = await verifyAuth(pubkey, token);
    if (!isAuthorized) throw new Error("Unauthorized");

    const events = await prisma.event.findMany({
      where: { organizerPubkey: pubkey },
      select: {
        id: true,
        tickets: {
          select: {
            isCheckedIn: true
          }
        }
      }
    });

    const stats: Record<string, { sold: number; checked: number }> = {};
    for (const ev of events) {
      const sold = ev.tickets.length;
      const checked = ev.tickets.filter((t: any) => t.isCheckedIn).length;
      stats[ev.id] = { sold, checked };
    }

    return stats;
  } catch (error) {
    console.error("Error fetching event stats:", error);
    return {};
  }
}

export async function cancelEventInDb(eventId: string, organizerPubkey: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event || event.organizerPubkey !== organizerPubkey) {
      return { success: false, error: "No autorizado o evento no encontrado." };
    }

    if (event.status === 'CANCELLED') {
      return { success: true };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'CANCELLED' }
    });

    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath(`/e/${eventId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error cancelling event:", error);
    return { success: false, error: error.message };
  }
}

export async function finishEventInDb(eventId: string, organizerPubkey: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event || event.organizerPubkey !== organizerPubkey) {
      return { success: false, error: "No autorizado o evento no encontrado." };
    }

    if (event.status === 'CLOSED') {
      return { success: true };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'CLOSED' }
    });

    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath(`/e/${eventId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error finishing event:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEventOffchain(eventId: string, organizerPubkey: string, data: {
  description?: string;
  coverImageUrl?: string;
  galleryUrls?: string[];
  doorTime?: string;
  ageRestriction?: string;
}) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event || event.organizerPubkey !== organizerPubkey) {
      return { success: false, error: "No autorizado o evento no encontrado." };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
        ...(data.galleryUrls !== undefined && { galleryUrls: data.galleryUrls }),
        ...(data.doorTime !== undefined && { doorTime: data.doorTime }),
        ...(data.ageRestriction !== undefined && { ageRestriction: data.ageRestriction }),
      }
    });

    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath(`/e/${eventId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error updating event offchain:", error);
    return { success: false, error: error.message };
  }
}
