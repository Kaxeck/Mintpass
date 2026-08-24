import { NextResponse } from "next/server";
import { 
  ActionGetResponse, 
  ActionPostRequest, 
  ActionPostResponse, 
  createActionHeaders
} from "@solana/actions";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPublicKey, createNoopSigner } from "@metaplex-foundation/umi";
import prisma from "../../../../../lib/prisma";

import { buildBuyTicketInstruction, deriveEventPDA } from "../../../../../lib/event-pda";
import { address } from "@solana/addresses";
import { getProgramDerivedAddress, getAddressEncoder } from "@solana/addresses";
import { EVENT_REGISTRY_PROGRAM_ID } from "../../../../../lib/anchor";

const headers = createActionHeaders({
  chainId: "devnet", // or mainnet
  actionVersion: "2.1.3", // specify version
});

function reply(payload: any, status = 200) {
  if (typeof payload === "string") {
    return new NextResponse(payload, { status, headers });
  }
  return NextResponse.json(payload, { status, headers });
}

export async function OPTIONS() {
  return reply("", 200);
}

export async function GET(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventSlug },
    include: { tickets: { select: { mintAddress: true } } }
  });
  if (!event) return reply({ error: "Evento no encontrado." }, 404);

  const payload: ActionGetResponse = {
    title: `Ticket: ${event.title}`,
    icon: event.coverImageUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819", 
    description: `Compra tu pase oficial para ${event.title}. Precio: ${event.ticketPriceSol} SOL.`,
    label: "Pagar y Mintear Ticket",
  };

  return reply(payload, 200);
}

export async function POST(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventSlug },
    include: { tickets: { select: { mintAddress: true } } }
  });
  if (!event) return reply({ error: "Evento no encontrado." }, 404);
  
  try {
    const body: ActionPostRequest = await request.json();
    let buyerPubkeyStr: string;
    try {
      buyerPubkeyStr = umiPublicKey(body.account).toString();
    } catch (err) {
      return reply({ error: "Cuenta de comprador inválida proporcionada." }, 400);
    }

    const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com");
    const buyerSigner = createNoopSigner(umiPublicKey(buyerPubkeyStr));
    umi.payer = buyerSigner;

    const organizerAddr = address(event.organizerPubkey);
    const collectionMint = event.collectionMint;
    
    if (!collectionMint) return reply({ error: "El evento no tiene colección on-chain." }, 400);

    const [eventRecordPda] = await deriveEventPDA(organizerAddr, collectionMint);
    const encoder = getAddressEncoder();
    const escrowStatePda = (await getProgramDerivedAddress({
      programAddress: EVENT_REGISTRY_PROGRAM_ID as any,
      seeds: [Buffer.from("escrow_state"), encoder.encode(eventRecordPda)]
    }))[0];

    const { generateSigner, transactionBuilder } = await import("@metaplex-foundation/umi");
    const ticketMintSigner = generateSigner(umi);

    const { instruction } = await buildBuyTicketInstruction(
      address(buyerPubkeyStr),
      eventRecordPda,
      organizerAddr,
      address(collectionMint),
      address(ticketMintSigner.publicKey.toString()),
      0, // zoneIndex 0 por defecto
      event.ticketImageUrl || event.coverImageUrl || "https://metadata.mintpass.app/ticket"
    );

    let finalTx = transactionBuilder().add({
      instruction: instruction,
      signers: [umi.identity, ticketMintSigner],
      bytesCreatedOnChain: 0
    });

    const blockhash = await umi.rpc.getLatestBlockhash();
    finalTx = finalTx.setBlockhash(blockhash);
    
    let transaction = finalTx.build(umi);
    transaction = await ticketMintSigner.signTransaction(transaction);

    const serializedTx = umi.transactions.serialize(transaction);
    const base64Tx = Buffer.from(serializedTx).toString('base64');

    const payload: ActionPostResponse = {
      type: "transaction",
      transaction: base64Tx,
      message: `¡El Ticket se minteará exitosamente!`,
    };

    return reply(payload, 200);
  } catch (err) {
    console.error("Error al procesar el Blink:", err);
    return reply({ error: "Internal Server Error" }, 500);
  }
}
