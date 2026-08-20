import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Inicializando el protocolo Mintpass en Solana Devnet...");

  // 1. Cargar la wallet local del usuario desde ~/.config/solana/id.json
  const walletPath = path.join(process.env.HOME || "", ".config", "solana", "id.json");
  if (!fs.existsSync(walletPath)) {
    throw new Error(`No se encontró el archivo de wallet local en: ${walletPath}`);
  }

  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8")));
  const keypair = Keypair.fromSecretKey(secretKey);

  console.log("🔑 Wallet Administradora (DEPLOYER_KEY):", keypair.publicKey.toBase58());

  // 2. Conectar a Solana Devnet
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  // 3. Cargar el IDL generado
  const idlPath = path.join(__dirname, "..", "anchor", "target", "idl", "mintpass_core.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(`No se encontró el IDL en: ${idlPath}`);
  }

  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new Program(idl, provider);

  // 4. Derivar la PDA del ProtocolConfig
  const [protocolConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  console.log("📍 Program ID:", program.programId.toBase58());
  console.log("📍 ProtocolConfig PDA:", protocolConfigPda.toBase58());

  // 5. Verificar si la PDA ya fue inicializada previamente
  const accountInfo = await connection.getAccountInfo(protocolConfigPda);
  if (accountInfo !== null) {
    console.log("✅ La PDA ProtocolConfig YA fue inicializada previamente en Devnet.");
    return;
  }

  // 6. Enviar la transacción initialize_protocol
  const authority = keypair.publicKey;
  const treasury = keypair.publicKey;

  console.log("⏳ Enviando transacción 'initialize_protocol' a Solana Devnet...");
  const tx = await program.methods
    .initializeProtocol(authority, treasury)
    .accounts({
      admin: keypair.publicKey,
      protocolConfig: protocolConfigPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("\n🎉 ¡Protocolo inicializado con éxito on-chain!");
  console.log("📜 Transacción (Tx Signature):", tx);
  console.log(`🔗 Ver en Solana Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
}

main().catch((err) => {
  console.error("❌ Error inicializando el protocolo:", err);
  process.exit(1);
});
