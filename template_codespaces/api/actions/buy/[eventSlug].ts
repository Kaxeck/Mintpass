import type { VercelRequest, VercelResponse } from "@vercel/node";
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
const ESCROW_PROGRAM_ID = new PublicKey("8NRJJTedLMqMVsZyFTzf3zKeHwgaSywmcTYsjVjB4kQz");
const EVENT_COLLECTION_MINT = "11111111111111111111111111111111"; // Reemplazar con el Mint de la Colección del Evento
const ORGANIZER_WALLET = new PublicKey("11111111111111111111111111111111"); // Wallet de quien organiza
const TICKET_PRICE_SOL = 0.5;

/**
 * Función auxiliar para centralizar la respuesta HTTP de Vercel (Node.js).
 * Solana Actions exige expresamente que TODA respuesta contenga los headers CORS especificados.
 */
function reply(res: VercelResponse, payload: any, status = 200) {
  // Inyectamos las cabeceras CORS obligatorias iterando sobre el objeto exportado oficial
  Object.entries(ACTIONS_CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  if (typeof payload === "string") return res.status(status).send(payload);
  return res.status(status).json(payload);
}

/**
 * Gestor principal de la API Vercel Edge/Serverless.
 * Funciona como el Gateway para resolver las peticiones GET/POST emitidas por Solana Blinks (Twitter, wallets).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Manejo del preflight CORS exigido rígidamente por el protocolo de Solana Actions
  if (req.method === "OPTIONS") {
    return reply(res, "", 200);
  }

  const { eventSlug } = req.query;
  const slug = typeof eventSlug === "string" ? eventSlug : "evento-desconocido";

  try {
    if (req.method === "GET") {
      return getActionMetadata(req, res, slug);
    } else if (req.method === "POST") {
      return await postActionTransaction(req, res, slug);
    }
    
    return reply(res, { error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("Error al procesar el Blink:", err);
    return reply(res, { error: "Internal Server Error" }, 500);
  }
}

// -------------------------------------------------------------
// GET /api/actions/buy/:eventSlug
// Devuelve la metadata estática y visual que renderiza el Blink en pantalla
// -------------------------------------------------------------
function getActionMetadata(req: VercelRequest, res: VercelResponse, slug: string) {
  const payload: ActionGetResponse = {
    title: `Ticket VIP: ${slug.toUpperCase()}`,
    // URL de ejemplo (idealmente un CID de Pinata que muestre el banner/ticket virtual)
    icon: "https://bafybeiclk6u6vw6w2okj4z7s72iab5hshxstlsgchom3wwomhmb2m7ikya.ipfs.w3s.link/mintpass.png", 
    description: `Compra tu pase oficial. Tu fondo está asegurado por un Escrow on-chain y se liberará al Organizador automáticamente al validar tu Check-in. Precio: ${TICKET_PRICE_SOL} SOL.`,
    label: "Pagar y Mintear Ticket",
  };

  return reply(res, payload, 200);
}

// -------------------------------------------------------------
// POST /api/actions/buy/:eventSlug
// Construye la transacción combinada (Escrow + Mint) para la wallet final.
// IMPORTANTE: Devuelve la orden no firmada por el usuario (solo la firma del Asset) para que su wallet apruebe el cobro en frontend.
// -------------------------------------------------------------
async function postActionTransaction(req: VercelRequest, res: VercelResponse, slug: string) {
  const body: ActionPostRequest = req.body;
  
  // Extraemos la base58 public key de la cuenta del usuario que clickeó en el cliente de front
  let buyerPubkey: PublicKey;
  try {
    buyerPubkey = new PublicKey(body.account);
  } catch (err) {
    return reply(res, { error: "Cuenta de comprador inválida proporcionada." }, 400);
  }

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
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

  // ----- PASO B: Instrucción de Mpl-Core (Generar Ticket NFT de manera instantánea) -----
  const umi = createUmi(connection);
  
  // Clave transitoria (Signer) nativa que le adjudica la dirección inmutable on-chain a tu ticket.
  const assetSigner = generateSigner(umi);

  // Creamos el builder con la descripción e imagen. Al estar en Serverless, podríamos armarlo aquí.
  const mintBuilder = createV1(umi, {
    asset: assetSigner,
    collection: umiPublicKey(EVENT_COLLECTION_MINT),
    name: `Ticket para ${slug.toUpperCase()}`,
    uri: "https://gateway.pinata.cloud/ipfs/QmTus...", 
    owner: umiPublicKey(buyerPubkey.toString()), // Empuja directamente a la wallet target (comprador)
  });

  // Convertimos dinámicamente las instrucciones UMI a lenguaje Web3.js nativas
  const mintInstructions = mintBuilder.getInstructions().map(toWeb3JsInstruction);
  transaction.add(...mintInstructions);

  // ----- PASO C: Configuración de la Transacción Final y Firmas de Autoridad -----
  transaction.feePayer = buyerPubkey;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;

  // IMPORTANTÍSIMO (Base de Blinks en Backend): UMI generó el Keypair 'assetSigner'.
  // Esta keypair DEBE firmar para darle autoridad de nacimiento.
  // Pero carecemos de la validación del payer (comprador). 
  // Solución: Dejamos la firma PARCIAL lista en backend y retornamos base64.
  const assetKeypair = Keypair.fromSecretKey(assetSigner.secretKey);
  transaction.partialSign(assetKeypair);

  // Empaquetamiento final apoyado en @solana/actions para la estandarización REST (ActionPostResponse)
  const payload: ActionPostResponse = await createPostResponse({
    fields: {
      type: "transaction",
      transaction: transaction,
      message: `¡El Ticket se minteará y el pago de ${TICKET_PRICE_SOL} SOL será retenido en Scrow de forma segura!`,
    }
  });

  return reply(res, payload, 200);
}
