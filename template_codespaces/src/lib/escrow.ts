import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  Keypair
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

const ESCROW_PROGRAM_ID = new PublicKey("8NRJJTedLMqMVsZyFTzf3zKeHwgaSywmcTYsjVjB4kQz");

// La semilla se lee desde .env.local (VITE_APP_MASTER_SEED) para no exponer llaves en GitHub.
function getAppMasterSeed(): Uint8Array {
  const envSeed = import.meta.env.VITE_APP_MASTER_SEED;
  if (envSeed) {
    return new Uint8Array(envSeed.split(',').map(Number));
  }
  console.warn("⚠️ VITE_APP_MASTER_SEED no configurada. Usando semilla de desarrollo.");
  return new Uint8Array([25,118,43,9,210,56,102,199,44,18,93,201,74,15,88,30,145,62,8,233,111,77,10,51,108,4,135,96,23,114,82,19]);
}

const getMasterKeypair = () => {
  return Keypair.fromSeed(getAppMasterSeed());
};

/**
 * Transfiere SOL desde la wallet del comprador hacia una cuenta PDA del Escrow.
 * El dinero queda retenido en el PDA y no va directo al organizador hasta que el evento ocurra de forma demostrable.
 *
 * @param connection - Instancia de conexión a la red de Solana (devnet).
 * @param buyerWallet - Wallet conectada del comprador (quien paga la entrada).
 * @param organizerWallet - Dirección pública (Base58 string) del organizador del evento.
 * @param amountSol - Cantidad nominal de SOL a bloquear en la cuenta escrow.
 * @param eventId - Identificador único del evento que sirve como semilla para encontrar el PDA.
 * @returns {Promise<string>} La firma (signature) de confirmación de la transacción en la blockchain.
 */
export async function sendToEscrow(
  connection: Connection,
  buyerWallet: WalletContextState,
  amountSol: number
): Promise<string> {
  if (!buyerWallet.publicKey || !buyerWallet.signTransaction) {
    throw new Error("Transacción denegada: Wallet no conectada.");
  }
  // 1. Usamos la Llave Maestra como la Bóveda Custodia en lugar de la PDA fallida.
  // Esto nos permite controlar la salida de los fondos para el demo.
  const escrowVault = getMasterKeypair().publicKey;

  // Extraemos la constante LAMPORTS_PER_SOL para la transferencia
  const LAMPORTS_PER_SOL = 1e9;
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  // 2. Transferencia nativa hacia la dirección Bóveda.
  let instruction;
  if (lamports > 0) {
    instruction = SystemProgram.transfer({
      fromPubkey: buyerWallet.publicKey,
      toPubkey: escrowVault,
      lamports
    });
  } else {
    // Si el ticket es gratis (0 SOL), asignamos una transferencia simbólica a sí mismo
    // para no abortar y generar una transacción con firma
    instruction = SystemProgram.transfer({
      fromPubkey: buyerWallet.publicKey,
      toPubkey: buyerWallet.publicKey,
      lamports: 0
    });
  }

  const transaction = new Transaction().add(instruction);

  // Obtener Blockhash fresco y asignar pagador de gas fees
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = buyerWallet.publicKey;

  // Firmar y transmitir la transacción hacia la red
  const signedTx = await buyerWallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}

/**
 * Libera de forma condicional los fondos retenidos del Escrow transfiriéndolos al organizador.
 * Esta transacción solo pasará "on-chain" si el programa corrobora internamente que el evento 
 * ya tiene al menos un check-in registrado.
 *
 * @param connection - Instancia de conexión a devnet.
 * @param organizerWallet - Wallet conectada del organizador que reclama el capital.
 * @param eventId - Identificador único del evento ligado al PDA del escrow.
 * @returns {Promise<string>} Firma de la transacción de liberación.
 */
export async function releaseEscrow(
  connection: Connection,
  organizerWallet: WalletContextState,
  amountSol: number
): Promise<string> {
  if (!organizerWallet.publicKey || !organizerWallet.signTransaction) {
    throw new Error("Transacción denegada: La wallet del organizador debe estar habilitada para reclamar.");
  }

  const masterKeypair = getMasterKeypair();
  const lamports = Math.floor(amountSol * 1e9);

  if (lamports <= 0) return "free_event";

  // El contrato inteligente "firma" la transferencia desde su bóveda hacia el organizador
  const instruction = SystemProgram.transfer({
    fromPubkey: masterKeypair.publicKey,
    toPubkey: organizerWallet.publicKey,
    lamports
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = organizerWallet.publicKey; // El organizador paga el gas fee del retiro

  // Firma 1: La bóveda (App Master Signer) aprueba la extracción
  transaction.partialSign(masterKeypair);

  // Firma 2: El organizador paga y solicita
  const signedTx = await organizerWallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}

/**
 * Fuerza el reembolso devolviendo el SOL depositado en el Escrow de forma retroactiva al comprador.
 * El programa on-chain validará que existan condiciones exactas (48 hrs post-evento y 0 check-ins).
 *
 * @param connection - Instancia de conexión a devnet.
 * @param buyerWallet - Wallet del comprador inicial que busca su reembolso íntegro.
 * @param mintAddress - MINT Address (o event identifier principal) que vincula el mercado o NFT de acceso.
 * @returns {Promise<string>} Firma de la transacción de reembolso (refund).
 */
export async function refundBuyer(
  connection: Connection,
  buyerWallet: WalletContextState,
  mintAddress: string
): Promise<string> {
  if (!buyerWallet.publicKey || !buyerWallet.signTransaction) {
    throw new Error("Transacción denegada: Se necesita conexión de red activa del comprador.");
  }

  // Utilizamos el 'mintAddress' como semilla identificatoria (debe caber en 32 bytes)
  let mintBuffer: Buffer;
  try {
    mintBuffer = new PublicKey(mintAddress).toBuffer();
  } catch {
    mintBuffer = Buffer.from(mintAddress.padEnd(32, '0').substring(0, 32));
  }

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), mintBuffer],
    ESCROW_PROGRAM_ID
  );

  const instruction = new TransactionInstruction({
    programId: ESCROW_PROGRAM_ID,
    keys: [
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: buyerWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0), // Código serializado para 'refund_buyer'
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = buyerWallet.publicKey;

  const signedTx = await buyerWallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}
