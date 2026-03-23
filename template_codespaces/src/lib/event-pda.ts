/**
 * event-pda.ts
 * 
 * 
 * Módulo para almacenar y leer los metadatos de eventos directamente en la blockchain de Solana
 * mediante PDAs (Program Derived Addresses). Cada evento se almacena en una cuenta PDA derivada
 * de la semilla ["event", organizer_pubkey, collection_mint_pubkey].
 * 
 * Costo aprox: ~0.003 SOL de rent-exempt por evento (datos < 1KB).
 * Las imágenes NO se almacenan on-chain, solo el link IPFS.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

// Program ID real del contrato mintpass-event-registry desplegado en Devnet
const EVENT_REGISTRY_PROGRAM_ID = new PublicKey("9inMKT4XXyRApVDDFGPQr9kcdWnuCk5YKJiDT8pTbtNj");

/**
 * Interfaz de los datos del evento que se almacenan on-chain
 */
export interface OnChainEventData {
  name: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  category: string;
  aforo: number;
  priceType: "free" | "sol" | "usdc";
  price: number;
  collectionMint: string;
  createdAt: number;
}

/**
 * Deriva la dirección PDA determinística para un evento específico.
 * La semilla combina "event" + wallet del organizador + collectionMint del evento.
 * 
 * @param organizerPubkey - PublicKey del organizador
 * @param collectionMint - Dirección del Collection Mint del evento
 * @returns [pda, bump] - La dirección PDA y su bump seed
 */
export function deriveEventPDA(organizerPubkey: PublicKey, collectionMint: string): [PublicKey, number] {
  const collectionPubkey = new PublicKey(collectionMint);
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("event"),
      organizerPubkey.toBuffer(),
      collectionPubkey.toBuffer(),
    ],
    EVENT_REGISTRY_PROGRAM_ID
  );
}

/**
 * Guarda los metadatos de un evento en la blockchain de Solana creando una cuenta PDA.
 * 
 * Esta función envía una transacción firmada por el organizador
 * que inicializa una cuenta PDA con los datos serializados del evento en formato JSON.
 * El costo es de ~0.003 SOL (rent-exempt deposit para la cuenta).
 * 
 * @param connection - Conexión RPC a devnet
 * @param organizerWallet - Wallet conectada del organizador que firmará y pagará la transacción
 * @param eventData - Datos completos del evento a almacenar on-chain
 * @returns Promise<string> - La dirección PDA donde se almacenó el evento
 */
export async function saveEventOnChain(
  connection: Connection,
  organizerWallet: WalletContextState,
  eventData: OnChainEventData
): Promise<string> {
  if (!organizerWallet.publicKey || !organizerWallet.signTransaction) {
    throw new Error("Se requiere una wallet conectada para guardar el evento en blockchain.");
  }

  // Derivamos la PDA única para este evento
  const [pda] = deriveEventPDA(organizerWallet.publicKey, eventData.collectionMint);

  // Serializamos los datos del evento como JSON para almacenarlos en la cuenta
  // En un programa de producción con Anchor, usaríamos serialización Borsh
  const payloadBuffer = Buffer.from(
    JSON.stringify({
      action: "create_event",
      data: eventData,
    })
  );

  const instruction = new TransactionInstruction({
    programId: EVENT_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: organizerWallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: payloadBuffer,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = organizerWallet.publicKey;

  // El organizador firma la transacción con su wallet (Phantom/Backpack)
  const signedTx = await organizerWallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  console.log(`Evento guardado on-chain en PDA: ${pda.toBase58()} (tx: ${signature})`);
  return pda.toBase58();
}

/**
 * Lee los datos de un evento específico desde su PDA en la blockchain.
 * Esta operación es de lectura (gratis, sin fees).
 * 
 * @param connection - Conexión RPC a devnet
 * @param organizerPubkey - PublicKey del organizador
 * @param collectionMint - Collection Mint del evento
 * @returns Los datos del evento o null si no existe
 */
export async function readEventFromChain(
  connection: Connection,
  organizerPubkey: PublicKey,
  collectionMint: string
): Promise<OnChainEventData | null> {
  try {
    const [pda] = deriveEventPDA(organizerPubkey, collectionMint);
    const accountInfo = await connection.getAccountInfo(pda);

    if (!accountInfo || !accountInfo.data) {
      return null;
    }

    // Parseamos el JSON almacenado en la cuenta PDA
    const payload = accountInfo.data.toString("utf8");
    const parsed = JSON.parse(payload);
    return parsed.data || null;
  } catch (e) {
    console.error("Error leyendo evento de la blockchain:", e);
    return null;
  }
}

/**
 * Lee TODOS los eventos de un organizador buscando las PDAs conocidas.
 * 
 * Como no podemos hacer queries arbitrarios en Solana fácilmente,
 * recibimos la lista de collectionMints conocidos y leemos cada PDA individualmente.
 * En producción usaríamos getProgramAccounts con filtros de memcmp o un indexer como Helius.
 * 
 * @param connection - Conexión RPC a devnet
 * @param organizerPubkey - PublicKey del organizador
 * @param knownCollectionMints - Lista de collection mints del organizador
 * @returns Array de eventos encontrados on-chain
 */
export async function readAllEventsFromChain(
  connection: Connection,
  organizerPubkey: PublicKey,
  knownCollectionMints: string[]
): Promise<OnChainEventData[]> {
  const events: OnChainEventData[] = [];

  // Leemos cada PDA en paralelo para mayor velocidad
  const results = await Promise.allSettled(
    knownCollectionMints.map(mint => readEventFromChain(connection, organizerPubkey, mint))
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      events.push(result.value);
    }
  }

  return events;
}
