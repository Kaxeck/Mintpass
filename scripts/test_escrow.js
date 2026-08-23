const { PublicKey, Connection } = require('@solana/web3.js');
const EVENT_REGISTRY_PROGRAM_ID = new PublicKey("FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM");
const eventRecordPda = new PublicKey("4E5xi8uPrjt1LkmrKBVXwCzjAHNT4FnoCEhJQLE9TyAJ");

const [escrowStatePda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("escrow_state"),
    eventRecordPda.toBuffer()
  ],
  EVENT_REGISTRY_PROGRAM_ID
);

console.log("Expected Escrow State PDA:", escrowStatePda.toBase58());

async function run() {
  const conn = new Connection("https://api.devnet.solana.com");
  const info = await conn.getAccountInfo(escrowStatePda);
  console.log("Account Info:", info);
}
run();
