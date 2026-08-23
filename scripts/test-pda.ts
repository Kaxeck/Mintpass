import { getAddressEncoder, address } from "@solana/addresses";
import { getProgramDerivedAddress } from "@solana/addresses";

async function test() {
  const encoder = getAddressEncoder();
  const EVENT_REGISTRY_PROGRAM_ID = address("FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM");
  const collectionMint = address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const organizerAddr = address("11111111111111111111111111111111");

  console.log("organizer encoded length:", encoder.encode(organizerAddr).length);

  try {
    const pda = await getProgramDerivedAddress({
      programAddress: EVENT_REGISTRY_PROGRAM_ID,
      seeds: [
        Buffer.from("event"),
        encoder.encode(organizerAddr),
        encoder.encode(collectionMint),
      ],
    });
    console.log("PDA success:", pda[0]);
  } catch (e) {
    console.error("PDA error:", e);
  }
}
test();
