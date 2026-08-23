const { PublicKey } = require('@solana/web3.js');
const EVENT_REGISTRY_PROGRAM_ID = new PublicKey("FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM");
const collectionMint = new PublicKey("8ZHfzUvjpxy74hNQKzaSyeygsSCPW6aj59JsPZF3G6Ta");
const userProvidedEventRecord = "4E5xi8uPrjt1LkmrKBVXwCzjAHNT4FnoCEhJQLE9TyAJ";

// Let's find out what organizer pubkey was used to generate this eventRecord
// Actually, we can't easily reverse a PDA, but we can check if it matches the one from DB.
// Let's just query the DB.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const event = await prisma.event.findFirst({
    where: { collectionMint: "8ZHfzUvjpxy74hNQKzaSyeygsSCPW6aj59JsPZF3G6Ta" }
  });
  if (!event) {
    console.log("No event found");
    return;
  }
  console.log("Organizer Pubkey in DB:", event.organizerPubkey);
  const organizerPubkey = new PublicKey(event.organizerPubkey);
  
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("event"),
      organizerPubkey.toBuffer(),
      collectionMint.toBuffer(),
    ],
    EVENT_REGISTRY_PROGRAM_ID
  );
  
  console.log("Derived PDA:", pda.toBase58());
  console.log("Expected PDA:", userProvidedEventRecord);
  console.log("Match?", pda.toBase58() === userProvidedEventRecord);
}
run().catch(console.error).finally(() => prisma.$disconnect());
