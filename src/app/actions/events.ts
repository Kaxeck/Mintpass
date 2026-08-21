'use server';

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { eventSchema } from "@/lib/validations";

export async function createEventInDb(eventData: any) {
  try {
    const validatedData = eventSchema.parse(eventData);

    // 1. Ensure the UserProfile exists for the organizer
    const organizerPubkey = validatedData.organizerWallet;

    if (!organizerPubkey) {
      throw new Error("Organizer wallet is required");
    }

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
      }
    });

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

export async function getEventsByOrganizer(pubkey: string) {
  try {
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

export async function getOrganizerEventStats(pubkey: string) {
  try {
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
