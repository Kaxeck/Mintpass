/**
 * event-pda.ts
 * 
 * Módulo para almacenar y leer los metadatos de eventos directamente en la blockchain de Solana
 * mediante PDAs (Program Derived Addresses) - reescrito con @solana/kit v5.x.
 */

import { Address, address, getAddressEncoder } from "@solana/addresses";
import { getProgramDerivedAddress } from "@solana/addresses";
import { BorshCoder, BN } from "@coral-xyz/anchor";
import { MINTPASS_IDL } from "./anchor";
import { Instruction as UmiInstruction } from "@metaplex-foundation/umi";

if (!process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID) throw new Error("Missing NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID");
const EVENT_REGISTRY_PROGRAM_ID = address(process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID);

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
  const encoder = getAddressEncoder();
  return getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [
      Buffer.from("event"),
      encoder.encode(organizerAddress),
      encoder.encode(collectionAddress),
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

  const encoder = getAddressEncoder();

  const protocolConfigPda = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("config")]
  }))[0];

  const collectionMetadataPda = (await getProgramDerivedAddress({
    programAddress: address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"), // Metaplex Token Metadata Program
    seeds: [
      Buffer.from("metadata"),
      encoder.encode(address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")),
      encoder.encode(address(eventData.collectionMint))
    ]
  }))[0];

  // The arguments must match the IDL exact casing and types
  const args = {
    name: eventData.name,
    description: eventData.description,
    eventTimestamp: new BN(new Date(`${eventData.date}T${eventData.time}`).getTime() / 1000), // convert to i64
    venue: eventData.venue,
    category: eventData.category,
    zones: eventData.zones.map(z => ({
      name: z.name,
      capacity: z.capacity,
      price: new BN(Math.round((Number(z.price) || 0) * 1_000_000_000)),
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

  const encoder = getAddressEncoder();

  const protocolConfigPda = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("config")]
  }))[0];

  const escrowVault = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("escrow"), encoder.encode(eventRecordPda)]
  }))[0];

  const escrowState = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("escrow_state"), encoder.encode(eventRecordPda)]
  }))[0];

  const ticketReceipt = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("receipt"), encoder.encode(ticketMint)]
  }))[0];

  const ticketCounter = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("counter"), encoder.encode(eventRecordPda), encoder.encode(buyerAddress)]
  }))[0];

  // Token Metadata PDA for ticketMint
  const ticketMetadata = (await getProgramDerivedAddress({
    programAddress: address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
    seeds: [
      Buffer.from("metadata"),
      encoder.encode(address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")),
      encoder.encode(ticketMint)
    ]
  }))[0];

  // Associated Token Account for Buyer and TicketMint
  const tokenAccount = (await getProgramDerivedAddress({
    programAddress: address("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
    seeds: [
      encoder.encode(buyerAddress),
      encoder.encode(address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")),
      encoder.encode(ticketMint)
    ]
  }))[0];

  if (!process.env.NEXT_PUBLIC_TREASURY_WALLET) throw new Error("Missing NEXT_PUBLIC_TREASURY_WALLET");
  const mintpassTreasury = address(process.env.NEXT_PUBLIC_TREASURY_WALLET);

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

    const coder = new BorshCoder(MINTPASS_IDL);
    const decoded = coder.accounts.decode("EventRecord", Buffer.from(accountInfo.data));
    if (!decoded) return null;

    const eventDate = decoded.eventTimestamp ? new Date(Number(decoded.eventTimestamp) * 1000) : new Date();
    const dateStr = eventDate.toISOString().split("T")[0];
    const timeStr = eventDate.toTimeString().split(" ")[0].slice(0, 5);

    return {
      name: decoded.name || "",
      description: decoded.description || "",
      date: dateStr,
      time: timeStr,
      venue: decoded.venue || "",
      category: decoded.category || "",
      zones: Array.isArray(decoded.zones) ? decoded.zones.map((z: any) => ({
        name: z.name,
        capacity: Number(z.capacity) || 0,
        price: (Number(z.price) || 0) / 1_000_000_000, // Lamports -> SOL
        ticketsSold: Number(z.ticketsSold) || 0
      })) : [],
      allowResale: Boolean(decoded.allowResale),
      resaleCapLimit: Number(decoded.resaleCapLimit) || 0,
      isSoulbound: Boolean(decoded.isSoulbound),
      allowRefunds: Boolean(decoded.allowRefunds),
      refundTimeLimit: Number(decoded.refundTimeLimit) || 0,
      identityLimit: Number(decoded.identityLimit) || 0,
      collectionMint: decoded.collectionMint ? decoded.collectionMint.toString() : collectionMint,
      createdAt: Number(decoded.createdAt) ? Number(decoded.createdAt) * 1000 : Date.now()
    };
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

/**
 * Construye la instrucción para cancelar un evento On-Chain.
 * 
 * @param organizerAddress - Address del organizador (signer y fee payer)
 * @param collectionMint - Collection Mint del evento
 * @returns La instrucción Umi
 */
export async function buildCancelEventInstruction(
  organizerAddress: Address,
  collectionMint: string
): Promise<UmiInstruction> {
  const encoder = getAddressEncoder();
  const coder = new BorshCoder(MINTPASS_IDL);

  const protocolConfigPda = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("config")]
  }))[0];

  const [eventRecordPda] = await deriveEventPDA(organizerAddress, collectionMint);

  const reputationPda = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("reputation"), encoder.encode(organizerAddress)]
  }))[0];

  const payload = coder.instruction.encode("cancelEvent", {});

  const instruction: UmiInstruction = {
    programId: EVENT_REGISTRY_PROGRAM_ID as any,
    keys: [
      { pubkey: protocolConfigPda as any, isSigner: false, isWritable: false },
      { pubkey: organizerAddress as any, isSigner: true, isWritable: true },
      { pubkey: organizerAddress as any, isSigner: false, isWritable: false },
      { pubkey: collectionMint as any, isSigner: false, isWritable: false },
      { pubkey: eventRecordPda as any, isSigner: false, isWritable: true },
      { pubkey: reputationPda as any, isSigner: false, isWritable: true },
    ],
    data: new Uint8Array(payload),
  };

  return instruction;
}

/**
 * Construye la instrucción para finalizar un evento exitosamente On-Chain.
 *
 * @param organizerAddress - Address del organizador (signer y fee payer)
 * @param collectionMint - Collection Mint del evento
 * @returns La instrucción Umi
 */
export async function buildFinishEventInstruction(
  organizerAddress: Address,
  collectionMint: string
): Promise<UmiInstruction> {
  const encoder = getAddressEncoder();
  const coder = new BorshCoder(MINTPASS_IDL);

  const protocolConfigPda = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("config")]
  }))[0];

  const [eventRecordPda] = await deriveEventPDA(organizerAddress, collectionMint);

  const reputationPda = (await getProgramDerivedAddress({
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    seeds: [Buffer.from("reputation"), encoder.encode(organizerAddress)]
  }))[0];

  const payload = coder.instruction.encode("finishEventSuccessfully", {});

  const instruction: UmiInstruction = {
    programId: EVENT_REGISTRY_PROGRAM_ID as any,
    keys: [
      { pubkey: protocolConfigPda as any, isSigner: false, isWritable: false },
      { pubkey: organizerAddress as any, isSigner: true, isWritable: true },
      { pubkey: organizerAddress as any, isSigner: false, isWritable: false },
      { pubkey: collectionMint as any, isSigner: false, isWritable: false },
      { pubkey: eventRecordPda as any, isSigner: false, isWritable: true },
      { pubkey: reputationPda as any, isSigner: false, isWritable: true },
    ],
    data: new Uint8Array(payload),
  };

  return instruction;
}