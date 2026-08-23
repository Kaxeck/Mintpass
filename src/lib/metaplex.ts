/**
 * metaplex.ts
 * 
 * Módulo principal para interacciones on-chain de Mintpass.
 * 
 * - MPL Core (crear colecciones, mintear tickets, POAPs) → via UMI
 * - Transferencias y PDAs → via @solana/kit v5.x
 * - Puente UMI ↔ Kit → via @metaplex-foundation/umi-kit-adapters
 */

import { generateSigner, Umi, publicKey, createSignerFromKeypair, transactionBuilder } from "@metaplex-foundation/umi";
import { createCollection, createV1, update, fetchAsset, fetchCollection } from "@metaplex-foundation/mpl-core";
import { uploadMetadata } from "./pinata";
import { createEscrowTransferInstruction } from "./escrow";
import {
  Address,
  address,
  getAddressDecoder,
  createKeyPairFromBytes,
} from "@solana/kit";
import { AccountRole, type Instruction } from "@solana/instructions";

// ─── Master Delegated Authority (via semilla) ───────────────────────
function getAppMasterSeed(): Uint8Array {
  const envSeed = process.env.NEXT_PUBLIC_APP_MASTER_SEED;
  if (!envSeed) {
    throw new Error("Configuración del servidor no disponible.");
  }
  const bytes = envSeed.split(',').map(s => s.trim()).filter(Boolean).map(Number);
  if (bytes.length !== 32) {
    throw new Error("Formato de configuración inválido.");
  }
  return new Uint8Array(bytes);
}

function getMasterSigner(umi: Umi) {
  const masterKeypair = umi.eddsa.createKeypairFromSeed(getAppMasterSeed());
  return createSignerFromKeypair(umi, masterKeypair);
}

/**
 * Obtiene la dirección maestra como Address de @solana/kit.
 */
export async function getMasterAddress(): Promise<Address> {
  const seed = getAppMasterSeed();
  const keyPair = await createKeyPairFromBytes(seed, false);
  const rawPub = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  return getAddressDecoder().decode(new Uint8Array(rawPub));
}

// ─── Program IDs ────────────────────────────────────────────────────
const MINTPASS_CORE_PROGRAM_ID = address(
  process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID || "FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM"
);
const SYSTEM_PROGRAM_ID = address("11111111111111111111111111111111");

/**
 * Deriva la PDA de reputación para un organizador.
 */
async function deriveReputationPDA(organizerAddress: Address): Promise<readonly [Address, number]> {
  const { getProgramDerivedAddress, getAddressEncoder } = await import("@solana/addresses");
  return getProgramDerivedAddress({
    programAddress: MINTPASS_CORE_PROGRAM_ID,
    seeds: [
      Buffer.from("reputation"),
      getAddressEncoder().encode(organizerAddress),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════
// CREATE EVENT COLLECTION (via Metaplex Core)
// ═══════════════════════════════════════════════════════════════════
export async function createEventCollectionBuilder(
  umi: Umi,
  eventData: {
    name: string;
    description: string;
    imageUrl: string;
    organizerWallet: string;
  }
): Promise<{ builder: any; collectionMint: string }> {
  const { createNft } = await import("@metaplex-foundation/mpl-token-metadata");
  const { generateSigner, percentAmount } = await import("@metaplex-foundation/umi");

  const metadataUri = await uploadMetadata({
    name: eventData.name,
    description: eventData.description,
    image: eventData.imageUrl,
    attributes: [
      { trait_type: "Tipo", value: "Event Collection" },
      { trait_type: "Organizador base", value: eventData.organizerWallet },
    ],
  });

  const collectionSigner = generateSigner(umi);

  const builder = createNft(umi, {
    mint: collectionSigner,
    name: eventData.name,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  });

  return { builder, collectionMint: collectionSigner.publicKey.toString() };
}

export async function createEventCollection(
  umi: Umi,
  eventData: {
    name: string;
    description: string;
    imageUrl: string;
    organizerWallet: string;
  }
): Promise<string> {
  const { builder, collectionMint } = await createEventCollectionBuilder(umi, eventData);
  await builder.sendAndConfirm(umi);
  return collectionMint;
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE TICKET INSTRUCTIONS (via Metaplex Token Metadata / SPL Token)
// The on-chain program expects ticket_mint owned by SPL Token program
// (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA), NOT Metaplex Core.
// ═══════════════════════════════════════════════════════════════════
export async function mintTicket(umi: Umi, params: {
  collectionMint: string;
  buyerAddress: Address;
  priceSol: number;
  qty: number;
  eventData: { name: string; date: string; venue: string; ticketNumber: number; imageUrl: string };
  escrowStatePda: Address;
}): Promise<{ txBuilder: any; mintSigner: any }[]> {
  const { createNft } = await import("@metaplex-foundation/mpl-token-metadata");
  const { publicKey, transactionBuilder, generateSigner } = await import("@metaplex-foundation/umi");

  const metadataUri = await uploadMetadata({
    name: `${params.eventData.name} Ticket`,
    description: `Ticket de entrada oficial para ${params.eventData.name}`,
    image: params.eventData.imageUrl,
    attributes: [
      { trait_type: "Fecha", value: params.eventData.date },
      { trait_type: "Lugar", value: params.eventData.venue }
    ],
  });

  const infos = [];

  for (let i = 0; i < params.qty; i++) {
    const mintSigner = generateSigner(umi);
    const ticketName = `${params.eventData.name} #${params.eventData.ticketNumber + i}`;

    const { createMint, setAuthority, AuthorityType } = await import("@metaplex-foundation/mpl-toolbox");
    const { createMetadataAccountV3 } = await import("@metaplex-foundation/mpl-token-metadata");
    const { some } = await import("@metaplex-foundation/umi");

    const builder = transactionBuilder()
      // 1. Crear el Mint vacío (sin supply), con autoridad temporal del comprador
      .add(createMint(umi, {
        mint: mintSigner,
        decimals: 0,
        mintAuthority: umi.identity.publicKey,
        freezeAuthority: umi.identity.publicKey,
      }))
      // 2. Crear la cuenta de Metadata (requiere firma de la autoridad del Mint temporal)
      .add(createMetadataAccountV3(umi, {
        mint: mintSigner.publicKey,
        mintAuthority: umi.identity,
        updateAuthority: umi.identity,
        data: {
          name: ticketName,
          symbol: "MTP",
          uri: metadataUri,
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: some({ key: publicKey(params.collectionMint), verified: false }),
          uses: null
        },
        isMutable: true,
        collectionDetails: null
      }))
      // 3. Transferir el MintAuthority al PDA de EscrowState para que el contrato Rust pueda acuñar
      .add(setAuthority(umi, {
        owned: mintSigner.publicKey,
        owner: umi.identity,
        authorityType: AuthorityType.MintTokens,
        newAuthority: params.escrowStatePda
      }))
      // 4. Transferir el FreezeAuthority al PDA de EscrowState (requerido por contrato)
      .add(setAuthority(umi, {
        owned: mintSigner.publicKey,
        owner: umi.identity,
        authorityType: AuthorityType.FreezeAccount,
        newAuthority: params.escrowStatePda
      }));

    infos.push({ txBuilder: builder, mintSigner });
  }

  return infos;
}

// ═══════════════════════════════════════════════════════════════════
// BUILD ESCROW TRANSFER INSTRUCTION (via @solana/kit)
// ═══════════════════════════════════════════════════════════════════
export { createEscrowTransferInstruction };

// ═══════════════════════════════════════════════════════════════════
// MUTATE TO POAP (via UMI / MPL Core)
// ═══════════════════════════════════════════════════════════════════
export async function mutateToPoap(
  umi: Umi,
  params: {
    mintAddress: string;
    collectionMint: string;
    eventData: {
      name: string;
      date: string;
      venue: string;
      ticketNumber: number;
      totalAttendees: number;
    };
    poapImageUrl: string;
  }
): Promise<void> {
  const poapName = `POAP — ${params.eventData.name} · ${params.eventData.date}`;

  const newMetadataUri = await uploadMetadata({
    name: poapName,
    description: `Este digital coleccionable POAP verifica la participación asistida y confirmada en: ${params.eventData.name}.`,
    image: params.poapImageUrl,
    attributes: [
      { trait_type: "Tipo", value: "POAP" },
      { trait_type: "Fecha", value: params.eventData.date },
      { trait_type: "Lugar", value: params.eventData.venue },
      { trait_type: "Asistente", value: `#${params.eventData.ticketNumber} de ${params.eventData.totalAttendees}` },
      { trait_type: "Verificado", value: "true" },
    ],
  });

  const coreAsset = await fetchAsset(umi, publicKey(params.mintAddress));
  const coreCollection = await fetchCollection(umi, publicKey(params.collectionMint));
  const appMasterSigner = getMasterSigner(umi);

  await update(umi, {
    asset: coreAsset,
    collection: coreCollection,
    name: poapName,
    uri: newMetadataUri,
    authority: appMasterSigner,
  }).sendAndConfirm(umi);
}

// ═══════════════════════════════════════════════════════════════════
// ORGANIZER REPUTATION (via @solana/kit)
// ═══════════════════════════════════════════════════════════════════

/**
 * Construye la instrucción para actualizar la reputación del organizador.
 * El caller debe firmar y enviar la transacción.
 */
export async function buildUpdateReputationInstruction(
  organizerAddress: Address,
  result: "success" | "cancel"
): Promise<Instruction> {
  const [pda] = await deriveReputationPDA(organizerAddress);

  const payload = Buffer.from(
    JSON.stringify({
      action: "update_score",
      result: result,
    })
  );

  return {
    programAddress: MINTPASS_CORE_PROGRAM_ID,
    accounts: [
      { address: pda, role: AccountRole.WRITABLE },
      { address: organizerAddress, role: AccountRole.WRITABLE_SIGNER },
      {
        address: SYSTEM_PROGRAM_ID,
        role: AccountRole.READONLY,
      },
    ],
    data: new Uint8Array(payload),
  };
}

/**
 * Consulta el puntaje de reputación desde la PDA on-chain (lectura gratis).
 */
export async function getOrganizerReputation(
  rpc: { getAccountInfo(address: Address): Promise<{ data: Uint8Array } | null> },
  organizerAddress: Address
): Promise<number> {
  try {
    const [pda] = await deriveReputationPDA(organizerAddress);
    const accountInfo = await rpc.getAccountInfo(pda);

    if (!accountInfo || !accountInfo.data) {
      return 0;
    }

    const payload = Buffer.from(accountInfo.data).toString("utf8");
    try {
      const parsed = JSON.parse(payload);
      return typeof parsed.score === "number" ? parsed.score : 0;
    } catch {
      return 0;
    }
  } catch (e) {
    console.error("Fallo on-chain detectando el perfil de reputación de organizador:", e);
    return 0;
  }
}