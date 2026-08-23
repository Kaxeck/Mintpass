'use server';

import prisma from "@/lib/prisma";
import { organizerProfileSchema } from "@/lib/validations";

import { revalidatePath } from 'next/cache';
import { verifyAuth } from "@/lib/auth";

export async function updateOrganizerProfileInDb(walletAddress: string, profileData: any) {
  try {
    const isAuthorized = await verifyAuth(walletAddress);
    if (!isAuthorized) throw new Error("Unauthorized");

    const validatedData = organizerProfileSchema.parse(profileData);

    const updatedUser = await prisma.userProfile.upsert({
      where: { walletPubkey: walletAddress },
      update: {
        companyName: validatedData.name,
        organizerCategory: validatedData.category,
        bio: validatedData.bio,
        logoUrl: validatedData.logoUrl,
        socialLinks: validatedData.socialLink ? JSON.stringify([validatedData.socialLink]) : undefined,
        contactEmail: validatedData.supportEmail,
        contactPhone: validatedData.internalPhone,
        role: "ORGANIZER",
      },
      create: {
        id: walletAddress,
        walletPubkey: walletAddress,
        companyName: validatedData.name,
        organizerCategory: validatedData.category,
        bio: validatedData.bio,
        logoUrl: validatedData.logoUrl,
        socialLinks: validatedData.socialLink ? JSON.stringify([validatedData.socialLink]) : undefined,
        contactEmail: validatedData.supportEmail,
        contactPhone: validatedData.internalPhone,
        role: "ORGANIZER",
      }
    });

    revalidatePath('/');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error: any) {
    console.error("Error updating organizer profile in DB:", error);
    return { success: false, error: error.message };
  }
}

export async function getOrganizerProfile(walletAddress: string) {
  try {
    const isAuthorized = await verifyAuth(walletAddress);
    if (!isAuthorized) throw new Error("Unauthorized");

    const profile = await prisma.userProfile.findUnique({
      where: { walletPubkey: walletAddress }
    });
    return profile;
  } catch (error) {
    console.error("Error fetching organizer profile:", error);
    return null;
  }
}
