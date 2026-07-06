/**
 * event-pda.ts
 * 
 * Módulo para almacenar y leer los metadatos de eventos directamente en la blockchain de Solana
 * mediante PDAs (Program Derived Addresses) - reescrito con @solana/kit v5.x.
 */

import { Address, address, getAddressEncoder } from "@solana/addresses";
import { getProgramDerivedAddress } from "@solana/addresses";
import { AccountRole, type Instruction } from "@solana/instructions";

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
  aforo: number;
  priceType: "free" | "sol" | "usdc";
  price: number;
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
): Promise<{ instruction: Instruction; pda: Address }> {
  const [pda] = await deriveEventPDA(organizerAddress, eventData.collectionMint);

  const payload = Buffer.from(
    JSON.stringify({
      action: "create_event",
      data: eventData,
    })
  );

  const instruction: Instruction = {
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    accounts: [
      { address: pda, role: AccountRole.WRITABLE },
      { address: organizerAddress, role: AccountRole.WRITABLE_SIGNER },
      {
        address: address("11111111111111111111111111111111"),
        role: AccountRole.READONLY,
      },
    ],
    data: new Uint8Array(payload),
  };

  return { instruction, pda };
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