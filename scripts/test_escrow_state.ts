import { PublicKey } from "@solana/web3.js";
const PROGRAM_ID = new PublicKey("FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM");
const eventRecord = new PublicKey("8cHut9HrYXKmkjsaLP22cEdbGPWd4VL2HNaFg7PSq6gV");
const [escrowState] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow_state"), eventRecord.toBuffer()],
  PROGRAM_ID
);
console.log(escrowState.toBase58());
