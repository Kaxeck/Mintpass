'use server';

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getUserTickets(walletAddress: string) {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { ownerPubkey: walletAddress },
      include: {
        event: true
      },
      orderBy: {
        lastUpdatedAt: "desc"
      }
    });
    return tickets;
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    return [];
  }
}

export async function mintTicketInDb(ticketData: any) {
  try {
    const { mintAddress, eventAddress, ownerPubkey, originalBuyerPubkey, zoneIndex, originalPrice, pricePaid } = ticketData;

    const ticket = await prisma.ticket.create({
      data: {
        mintAddress,
        eventAddress,
        ownerPubkey,
        originalBuyerPubkey: originalBuyerPubkey || ownerPubkey,
        status: "VALID",
        zoneIndex: zoneIndex || 0,
        originalPrice: originalPrice || 0,
        pricePaid: pricePaid || 0,
        lastSyncedSlot: 0,
      }
    });
    
    // Also log the creation
    await prisma.ticketAuditLog.create({
      data: {
        ticketMint: mintAddress,
        newStatus: "VALID",
        changedAtSlot: 0,
        txSignature: "mint_" + mintAddress,
      }
    });

    revalidatePath('/tickets');
    return { success: true, ticket };
  } catch (error: any) {
    console.error("Error minting ticket in DB:", error);
    return { success: false, error: error.message };
  }
}

export async function checkInTicket(mintAddress: string, staffId?: string) {
  try {
    const ticket = await prisma.ticket.update({
      where: { mintAddress },
      data: {
        status: "CHECKED_IN",
        isCheckedIn: true,
        checkinTimestamp: new Date(),
        checkinStaffId: staffId,
      }
    });

    await prisma.ticketAuditLog.create({
      data: {
        ticketMint: mintAddress,
        previousStatus: "VALID",
        newStatus: "CHECKED_IN",
        changedAtSlot: 0,
        txSignature: "checkin_" + mintAddress + "_" + Date.now(),
      }
    });

    return { success: true, ticket };
  } catch (error: any) {
    console.error("Error checking in ticket:", error);
    return { success: false, error: error.message };
  }
}

export async function getEventTickets(eventId: number) {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { eventAddress: eventId.toString() },
      orderBy: {
        lastUpdatedAt: "desc"
      }
    });
    return tickets;
  } catch (error) {
    console.error("Error fetching event tickets:", error);
    return [];
  }
}
