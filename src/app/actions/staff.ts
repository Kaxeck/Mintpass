'use server';

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getStaffLinks(eventId: string) {
  try {
    const links = await prisma.staffAccessLink.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, links };
  } catch (error: any) {
    console.error("Error fetching staff links:", error);
    return { success: false, error: error.message };
  }
}

export async function getStaffLinksByEvents(eventIds: string[]) {
  try {
    const links = await prisma.staffAccessLink.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, links };
  } catch (error: any) {
    console.error("Error fetching staff links for multiple events:", error);
    return { success: false, error: error.message };
  }
}

export async function createStaffLink(eventId: string, name: string, token: string) {
  try {
    const link = await prisma.staffAccessLink.create({
      data: {
        eventId,
        name,
        token,
        status: "ACTIVE"
      }
    });
    revalidatePath('/dashboard');
    return { success: true, link };
  } catch (error: any) {
    console.error("Error creating staff link:", error);
    return { success: false, error: error.message };
  }
}

export async function revokeStaffLink(linkId: string) {
  try {
    const link = await prisma.staffAccessLink.update({
      where: { id: linkId },
      data: { status: "REVOKED" }
    });
    revalidatePath('/dashboard');
    return { success: true, link };
  } catch (error: any) {
    console.error("Error revoking staff link:", error);
    return { success: false, error: error.message };
  }
}
