const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

async function main() {
  const conn = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com");
  const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID || "FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM");
  
  const [protocolConfig] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
  
  const accountInfo = await conn.getAccountInfo(protocolConfig);
  if (!accountInfo) {
    console.log("ProtocolConfig account not found!");
  } else {
    // authority is usually the first 32 bytes after 8 byte discriminator
    const authority = new PublicKey(accountInfo.data.slice(8, 40));
    console.log("ProtocolConfig Authority:", authority.toBase58());
  }

  if (process.env.APP_MASTER_SEED) {
    const arr = process.env.APP_MASTER_SEED.split(",").map(Number);
    const keypair = Keypair.fromSeed(new Uint8Array(arr));
    console.log("Relayer Keypair:", keypair.publicKey.toBase58());
  } else {
    console.log("APP_MASTER_SEED not set");
  }
}
main().catch(console.error);
