import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";

async function check() {
  const conn = new Connection("https://api.devnet.solana.com");
  const EVENT_REGISTRY_PROGRAM_ID = new PublicKey("FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM");
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], EVENT_REGISTRY_PROGRAM_ID);
  
  const info = await conn.getAccountInfo(configPda);
  if (!info) {
    console.log("Config is null!");
    return;
  }
  console.log("Config data len:", info.data.length);
  // Using anchor to deserialize
  // But we don't need anchor, we can just look at the pubkey in the data.
  // The ProtocolConfig struct:
  // u64: discriminator (8 bytes)
  // Pubkey: authority (32 bytes)
  // Pubkey: treasury (32 bytes)
  // u16: base_fee_bps (2 bytes)
  // bool: is_paused (1 byte)
  // ...
  
  const authority = new PublicKey(info.data.subarray(8, 40));
  const treasury = new PublicKey(info.data.subarray(40, 72));
  console.log("Authority:", authority.toBase58());
  console.log("Treasury:", treasury.toBase58());
}
check();
