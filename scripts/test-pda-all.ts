import { address, getAddressEncoder } from "@solana/addresses";
import { getProgramDerivedAddress } from "@solana/addresses";

async function test() {
  const EVENT_REGISTRY_PROGRAM_ID = address("FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM");
  const encoder = getAddressEncoder();

  const buyerAddress = address("11111111111111111111111111111111");
  const organizerAddr = address("11111111111111111111111111111111");
  const collectionMint = address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const ticketMint = address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

  const [eventRecordPda] = await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [
      Buffer.from("event"),
      encoder.encode(organizerAddr),
      encoder.encode(collectionMint),
    ],
  });

  console.log("eventRecordPda:", eventRecordPda);
  console.log("encoder.encode(eventRecordPda).length:", encoder.encode(eventRecordPda).length);

  try {
    const escrowVault = await getProgramDerivedAddress({
      programAddress: EVENT_REGISTRY_PROGRAM_ID,
      seeds: [Buffer.from("escrow"), encoder.encode(eventRecordPda)]
    });
    console.log("escrowVault success");
  } catch (e: any) {
    console.log("escrowVault error:", e.message);
  }

  try {
    const ticketReceipt = await getProgramDerivedAddress({
      programAddress: EVENT_REGISTRY_PROGRAM_ID,
      seeds: [Buffer.from("receipt"), encoder.encode(ticketMint)]
    });
    console.log("ticketReceipt success");
  } catch (e: any) {
    console.log("ticketReceipt error:", e.message);
  }

  try {
    const ticketCounter = await getProgramDerivedAddress({
      programAddress: EVENT_REGISTRY_PROGRAM_ID,
      seeds: [Buffer.from("counter"), encoder.encode(eventRecordPda), encoder.encode(buyerAddress)]
    });
    console.log("ticketCounter success");
  } catch (e: any) {
    console.log("ticketCounter error:", e.message);
  }
}
test();
