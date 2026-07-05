import { NextResponse } from "next/server";
import { 
  ActionGetResponse, 
  ActionPostRequest, 
  ActionPostResponse, 
  ACTIONS_CORS_HEADERS
} from "@solana/actions";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPublicKey, generateSigner, createNoopSigner, transactionBuilder, publicKeyBytes } from "@metaplex-foundation/umi";
import { createV1 } from "@metaplex-foundation/mpl-core";

// Constantes integradas de nuestros módulos previos
const ESCROW_PROGRAM_ID = process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID as string;
const EVENT_COLLECTION_MINT = process.env.NEXT_PUBLIC_EVENT_COLLECTION_MINT as string;
const ORGANIZER_WALLET = process.env.NEXT_PUBLIC_ORGANIZER_WALLET as string;
const TICKET_PRICE_SOL = Number(process.env.NEXT_PUBLIC_TICKET_PRICE_SOL);
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

function reply(payload: any, status = 200) {
  if (typeof payload === "string") {
    return new NextResponse(payload, { status, headers: ACTIONS_CORS_HEADERS });
  }
  return NextResponse.json(payload, { status, headers: ACTIONS_CORS_HEADERS });
}

export async function OPTIONS() {
  return reply("", 200);
}

export async function GET(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const slug = eventSlug || "evento-desconocido";
  
  if (!ESCROW_PROGRAM_ID || !EVENT_COLLECTION_MINT || !ORGANIZER_WALLET || !TICKET_PRICE_SOL) {
    return reply({ error: "Servidor mal configurado: Faltan variables de entorno." }, 500);
  }

  const payload: ActionGetResponse = {
    title: `Ticket VIP: ${slug.toUpperCase()}`,
    icon: "https://bafybeiclk6u6vw6w2okj4z7s72iab5hshxstlsgchom3wwomhmb2m7ikya.ipfs.w3s.link/mintpass.png", 
    description: `Compra tu pase oficial. Tu fondo está asegurado por un Escrow on-chain y se liberará al Organizador automáticamente al validar tu Check-in. Precio: ${TICKET_PRICE_SOL} SOL.`,
    label: "Pagar y Mintear Ticket",
  };

  return reply(payload, 200);
}

export async function POST(request: Request, { params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const slug = eventSlug || "evento-desconocido";
  
  try {
    if (!ESCROW_PROGRAM_ID || !EVENT_COLLECTION_MINT || !ORGANIZER_WALLET || !TICKET_PRICE_SOL) {
      return reply({ error: "Servidor mal configurado: Faltan variables de entorno." }, 500);
    }

    const body: ActionPostRequest = await request.json();
    
    let buyerPubkeyStr: string;
    try {
      // Validate pubkey format via UMI
      buyerPubkeyStr = umiPublicKey(body.account).toString();
    } catch (err) {
      return reply({ error: "Cuenta de comprador inválida proporcionada." }, 400);
    }

    const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com");
    
    // Set buyer as the fee payer via a NoopSigner (will sign on the client side)
    const buyerSigner = createNoopSigner(umiPublicKey(buyerPubkeyStr));
    umi.payer = buyerSigner;

    // ----- PASO A: Instrucción de Escrow (Depósito Protegido) -----
    // Derive Escrow PDA
    const [escrowPda] = umi.eddsa.findPda(umiPublicKey(ESCROW_PROGRAM_ID), [
      new Uint8Array(Buffer.from("escrow")),
      publicKeyBytes(umiPublicKey(EVENT_COLLECTION_MINT))
    ]);

    const escrowInstruction = {
      instruction: {
        programId: umiPublicKey(ESCROW_PROGRAM_ID),
        keys: [
          { pubkey: buyerSigner.publicKey, isSigner: true, isWritable: true },
          { pubkey: escrowPda, isSigner: false, isWritable: true },
          { pubkey: umiPublicKey(ORGANIZER_WALLET), isSigner: false, isWritable: false },
          { pubkey: umiPublicKey(SYSTEM_PROGRAM_ID), isSigner: false, isWritable: false },
        ],
        data: new Uint8Array(0), 
      },
      signers: [buyerSigner],
      bytesCreatedOnChain: 0
    };

    // ----- PASO B: Instrucción de Mpl-Core -----
    const assetSigner = generateSigner(umi);

    const mintBuilder = createV1(umi, {
      asset: assetSigner,
      collection: umiPublicKey(EVENT_COLLECTION_MINT),
      name: `Ticket para ${slug.toUpperCase()}`,
      uri: "https://gateway.pinata.cloud/ipfs/QmTus...", 
      owner: buyerSigner.publicKey,
    });

    // ----- PASO C: Configuración de la Transacción Final y Firmas de Autoridad -----
    let builder = transactionBuilder()
      .add(escrowInstruction)
      .add(mintBuilder);
      
    // Fetch latest blockhash and build
    const blockhash = await umi.rpc.getLatestBlockhash();
    builder = builder.setBlockhash(blockhash);
    
    let transaction = builder.build(umi);
    
    // Partially sign with the asset signer (buyer signs later)
    transaction = await assetSigner.signTransaction(transaction);

    // Serialize to base64 for the Blink payload
    const serializedTx = umi.transactions.serialize(transaction);
    const base64Tx = Buffer.from(serializedTx).toString('base64');

    const payload: ActionPostResponse = {
      type: "transaction",
      transaction: base64Tx,
      message: `¡El Ticket se minteará y el pago de ${TICKET_PRICE_SOL} SOL será retenido en Scrow de forma segura!`,
    };

    return reply(payload, 200);
  } catch (err) {
    console.error("Error al procesar el Blink:", err);
    return reply({ error: "Internal Server Error" }, 500);
  }
}
