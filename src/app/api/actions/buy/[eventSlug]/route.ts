import { NextResponse } from "next/server";
import { 
  ActionGetResponse, 
  ActionPostRequest, 
  ActionPostResponse, 
  createPostResponse, 
  ACTIONS_CORS_HEADERS
} from "@solana/actions";
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  TransactionInstruction,
  Keypair
} from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPublicKey, generateSigner } from "@metaplex-foundation/umi";
import { createV1 } from "@metaplex-foundation/mpl-core";
import { toWeb3JsInstruction } from "@metaplex-foundation/umi-web3js-adapters"; 

// Constantes integradas de nuestros módulos previos
const ESCROW_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID || "8NRJJTedLMqMVsZyFTzf3zKeHwgaSywmcTYsjVjB4kQz");
const EVENT_COLLECTION_MINT = process.env.NEXT_PUBLIC_EVENT_COLLECTION_MINT || "11111111111111111111111111111111"; // Reemplazar con el Mint de la Colección del Evento
const ORGANIZER_WALLET = new PublicKey(process.env.NEXT_PUBLIC_ORGANIZER_WALLET || "11111111111111111111111111111111"); // Wallet de quien organiza
const TICKET_PRICE_SOL = Number(process.env.NEXT_PUBLIC_TICKET_PRICE_SOL) || 0.5;

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
    const body: ActionPostRequest = await request.json();
    
    let buyerPubkey: PublicKey;
    try {
      buyerPubkey = new PublicKey(body.account);
    } catch (err) {
      return reply({ error: "Cuenta de comprador inválida proporcionada." }, 400);
    }

    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
    const transaction = new Transaction();

    // ----- PASO A: Instrucción de Escrow (Depósito Protegido) -----
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), Buffer.from(EVENT_COLLECTION_MINT)],
      ESCROW_PROGRAM_ID
    );

    const escrowInstruction = new TransactionInstruction({
      programId: ESCROW_PROGRAM_ID,
      keys: [
        { pubkey: buyerPubkey, isSigner: true, isWritable: true },
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: ORGANIZER_WALLET, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.alloc(0), 
    });
    transaction.add(escrowInstruction);

    // ----- PASO B: Instrucción de Mpl-Core -----
    const umi = createUmi(connection);
    const assetSigner = generateSigner(umi);

    const mintBuilder = createV1(umi, {
      asset: assetSigner,
      collection: umiPublicKey(EVENT_COLLECTION_MINT),
      name: `Ticket para ${slug.toUpperCase()}`,
      uri: "https://gateway.pinata.cloud/ipfs/QmTus...", 
      owner: umiPublicKey(buyerPubkey.toString()),
    });

    const mintInstructions = mintBuilder.getInstructions().map(toWeb3JsInstruction);
    transaction.add(...mintInstructions);

    // ----- PASO C: Configuración de la Transacción Final y Firmas de Autoridad -----
    transaction.feePayer = buyerPubkey;
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;

    const assetKeypair = Keypair.fromSecretKey(assetSigner.secretKey);
    transaction.partialSign(assetKeypair);

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction: transaction,
        message: `¡El Ticket se minteará y el pago de ${TICKET_PRICE_SOL} SOL será retenido en Scrow de forma segura!`,
      }
    });

    return reply(payload, 200);
  } catch (err) {
    console.error("Error al procesar el Blink:", err);
    return reply({ error: "Internal Server Error" }, 500);
  }
}
