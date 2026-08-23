import { Connection, PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
async function main() {
  const conn = new Connection("https://api.devnet.solana.com");
  const programId = new PublicKey("FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM");
  const idl = await Program.fetchIdl(programId, { connection: conn });
  console.log(JSON.stringify(idl, null, 2));
}
main().catch(console.error);
