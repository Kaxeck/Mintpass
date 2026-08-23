import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";

const prisma = new PrismaClient();

async function check() {
  const event = await prisma.event.findFirst({
    where: { collectionMint: "8ZHfzUvjpxy74hNQKzaSyeygsSCPW6aj59JsPZF3G6Ta" }
  });
  if (!event) {
    console.log("Evento no encontrado en DB");
    return;
  }
  
  console.log("Organizer Pubkey en DB:", event.organizerPubkey);
  
  const EVENT_REGISTRY_PROGRAM_ID = new PublicKey("FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM");
  const organizerPubkey = new PublicKey(event.organizerPubkey!);
  const collectionMint = new PublicKey(event.collectionMint!);
  
  const [eventPda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("event"),
      organizerPubkey.toBuffer(),
      collectionMint.toBuffer(),
    ],
    EVENT_REGISTRY_PROGRAM_ID
  );
  
  console.log("Calculated EventRecord PDA:", eventPda.toBase58());
}

check().catch(console.error).finally(() => prisma.$disconnect());
