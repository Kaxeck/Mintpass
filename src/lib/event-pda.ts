/**
 * event-pda.ts
 * 
 * Módulo para almacenar y leer los metadatos de eventos directamente en la blockchain de Solana
 * mediante PDAs (Program Derived Addresses) - reescrito con @solana/kit v5.x.
 */

import { Address, address } from "@solana/addresses";
import { getProgramDerivedAddress } from "@solana/addresses";
import { BorshCoder } from "@coral-xyz/anchor";
import { MINTPASS_IDL } from "./anchor";
import { Instruction as UmiInstruction } from "@metaplex-foundation/umi";

// Program ID del contrato mintpass-event-registry desplegado en Devnet
const EVENT_REGISTRY_PROGRAM_ID = address(
  process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID || "11111111111111111111111111111111"
);

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
  coverImage?: string;
  lineup?: string[];
  zones: { name: string; capacity: number; price: number }[];
  allowResale: boolean;
  resaleCapLimit?: number;
  isSoulbound: boolean;
  allowRefunds?: boolean;
  refundTimeLimit?: number;
  identityLimit?: number;
  collectionMint: string;
  createdAt: number;
}

/**
 * Deriva la dirección PDA determinística para un evento específico.
 * @param organizerAddress - Address del organizador
 * @param collectionMint - Dirección del Collection Mint del evento
 * @returns Promise<[Address, number]> - La dirección PDA y su bump
 */
export async function deriveEventPDA(
  organizerAddress: Address,
  collectionMint: string
): Promise<readonly [Address, number]> {
  const collectionAddress = address(collectionMint);
  return getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [
      Buffer.from("event"),
      organizerAddress,
      collectionAddress,
    ],
  });
}

/**
 * Construye la instrucción para guardar metadatos on-chain.
 * NO envía la transacción - solo construye la instrucción.
 * El caller debe firmar y enviar la transacción.
 * 
 * @param organizerAddress - Address del organizador (será signer y fee payer)
 * @param eventData - Datos del evento
 * @returns La instrucción y la dirección PDA
 */
export async function buildSaveEventInstruction(
  organizerAddress: Address,
  eventData: OnChainEventData
): Promise<{ instruction: UmiInstruction; pda: Address }> {
  const [pda] = await deriveEventPDA(organizerAddress, eventData.collectionMint);

  const coder = new BorshCoder(MINTPASS_IDL);

  const protocolConfigPda = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("config")]
  }))[0];

  const collectionMetadataPda = (await getProgramDerivedAddress({
    programAddress: address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"), // Metaplex Token Metadata Program
    seeds: [
      Buffer.from("metadata"),
      address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
      address(eventData.collectionMint)
    ]
  }))[0];

  // The arguments must match the IDL exact casing and types
  const args = {
    name: eventData.name,
    description: eventData.description,
    eventTimestamp: new (BorshCoder as any).BN(new Date(`${eventData.date}T${eventData.time}`).getTime() / 1000), // convert to i64
    venue: eventData.venue,
    category: eventData.category,
    zones: eventData.zones.map(z => ({
      name: z.name,
      capacity: z.capacity,
      price: new (BorshCoder as any).BN(z.price),
      ticketsSold: 0
    })),
    allowResale: eventData.allowResale,
    resaleCapLimit: eventData.resaleCapLimit || 0,
    isSoulbound: eventData.isSoulbound,
    allowRefunds: eventData.allowRefunds || false,
    refundTimeLimit: eventData.allowRefunds && eventData.refundTimeLimit ? eventData.refundTimeLimit : 0,
    identityLimit: eventData.identityLimit || 0,
  };

  const payload = coder.instruction.encode("createEvent", args);

  const instruction: UmiInstruction = {
    programId: EVENT_REGISTRY_PROGRAM_ID as any,
    keys: [
      { pubkey: organizerAddress as any, isSigner: true, isWritable: true },
      { pubkey: eventData.collectionMint as any, isSigner: false, isWritable: false },
      { pubkey: collectionMetadataPda as any, isSigner: false, isWritable: false },
      { pubkey: pda as any, isSigner: false, isWritable: true },
      { pubkey: protocolConfigPda as any, isSigner: false, isWritable: false },
      { pubkey: "11111111111111111111111111111111" as any, isSigner: false, isWritable: false }, // System
    ],
    data: new Uint8Array(payload),
  };

  return { instruction, pda };
}

export async function buildBuyTicketInstruction(
  buyerAddress: Address,
  eventRecordPda: Address,
  organizerAddress: Address,
  ticketMint: Address,
  zoneIndex: number
): Promise<{ instruction: UmiInstruction; receiptPda: Address }> {
  const coder = new BorshCoder(MINTPASS_IDL);

  const protocolConfigPda = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("config")]
  }))[0];

  const escrowVault = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("escrow"), address(eventRecordPda)]
  }))[0];

  const escrowState = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("escrow_state"), address(eventRecordPda)]
  }))[0];

  const ticketReceipt = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("receipt"), address(ticketMint)]
  }))[0];

  const ticketCounter = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("counter"), address(eventRecordPda), address(buyerAddress)]
  }))[0];

  // Token Metadata PDA for ticketMint
  const ticketMetadata = (await getProgramDerivedAddress({
    programAddress: address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
    seeds: [
      Buffer.from("metadata"),
      address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
      address(ticketMint)
    ]
  }))[0];

  // Associated Token Account for Buyer and TicketMint
  const tokenAccount = (await getProgramDerivedAddress({
    programAddress: address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    seeds: [
      address(buyerAddress),
      address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      address(ticketMint)
    ]
  }))[0];

  const mintpassTreasury = address(process.env.NEXT_PUBLIC_TREASURY_WALLET || "22222222222222222222222222222222"); // TODO: Use real treasury

  const payload = coder.instruction.encode("buyTicket", { zoneIndex });

  const instruction: UmiInstruction = {
    programId: EVENT_REGISTRY_PROGRAM_ID as any,
    keys: [
      { pubkey: buyerAddress as any, isSigner: true, isWritable: true }, // 1. payer
      { pubkey: buyerAddress as any, isSigner: true, isWritable: true }, // 2. buyer
      { pubkey: ticketMint as any, isSigner: false, isWritable: true },  // 3. ticketMint
      { pubkey: ticketReceipt as any, isSigner: false, isWritable: true }, // 4. ticketReceipt
      { pubkey: protocolConfigPda as any, isSigner: false, isWritable: false }, // 5. protocolConfig
      { pubkey: mintpassTreasury as any, isSigner: false, isWritable: true }, // 6. mintpassTreasury
      { pubkey: EVENT_REGISTRY_PROGRAM_ID as any, isSigner: false, isWritable: false }, // 7. whitelistRecord (Optional, pass programId if none)
      { pubkey: escrowVault as any, isSigner: false, isWritable: true }, // 8. escrowVault
      { pubkey: escrowState as any, isSigner: false, isWritable: true }, // 9. escrowState
      { pubkey: eventRecordPda as any, isSigner: false, isWritable: true }, // 10. eventRecord
      { pubkey: tokenAccount as any, isSigner: false, isWritable: true }, // 11. tokenAccount
      { pubkey: ticketCounter as any, isSigner: false, isWritable: true }, // 12. ticketCounter
      { pubkey: ticketMetadata as any, isSigner: false, isWritable: false }, // 13. ticketMetadata
      { pubkey: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as any, isSigner: false, isWritable: false }, // 14. tokenProgram
      { pubkey: "11111111111111111111111111111111" as any, isSigner: false, isWritable: false }, // 15. systemProgram
    ],
    data: new Uint8Array(payload),
  };

  return { instruction, receiptPda: ticketReceipt };
}

/**
 * Lee los datos de un evento desde su PDA (gratis, on-chain read).
 * 
 * @param rpc - Instancia RPC de @solana/kit o cualquier objeto con getAccountInfo
 * @param organizerAddress - Address del organizador
 * @param collectionMint - Collection Mint del evento
 * @returns Datos del evento o null
 */
export async function readEventFromChain(
  rpc: { getAccountInfo(address: Address): Promise<{ data: Uint8Array } | null> },
  organizerAddress: Address,
  collectionMint: string
): Promise<OnChainEventData | null> {
  try {
    const [pda] = await deriveEventPDA(organizerAddress, collectionMint);
    const accountInfo = await rpc.getAccountInfo(pda);

    if (!accountInfo || !accountInfo.data) {
      return null;
    }

    const payload = Buffer.from(accountInfo.data).toString("utf8");
    const parsed = JSON.parse(payload);
    return parsed.data || null;
  } catch (e) {
    console.error("Error leyendo evento de la blockchain:", e);
    return null;
  }
}

/**
 * Lee TODOS los eventos de un organizador desde sus PDAs conocidas.
 * 
 * @param rpc - Instancia RPC
 * @param organizerAddress - Address del organizador
 * @param knownCollectionMints - Lista de collection mints
 * @returns Array de eventos
 */
export async function readAllEventsFromChain(
  rpc: { getAccountInfo(address: Address): Promise<{ data: Uint8Array } | null> },
  organizerAddress: Address,
  knownCollectionMints: string[]
): Promise<OnChainEventData[]> {
  const results = await Promise.allSettled(
    knownCollectionMints.map((mint) =>
      readEventFromChain(rpc, organizerAddress, mint)
    )
  );

  const events: OnChainEventData[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      events.push(result.value);
    }
  }
  return events;
}