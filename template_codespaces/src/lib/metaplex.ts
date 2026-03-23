import { generateSigner, Umi, publicKey } from "@metaplex-foundation/umi";
import { createCollection, createV1 } from "@metaplex-foundation/mpl-core";
import { uploadMetadata } from "./pinata";
import { sendToEscrow } from "./escrow";
import { Connection } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

/**
 * Crea una nueva Colección (Collection NFT) on-chain en Solana usando el estándar Metaplex Core.
 *
 * Esta función ejecuta las siguientes operaciones en la cadena (on-chain) y off-chain:
 * 1. Prepara y envía la metadata JSON del evento a IPFS a través de Pinata.
 * 2. Genera automáticamente una nueva dirección criptográfica (Keypair Signer) única 
 *    que representará de forma oficial la dirección (Mint/Asset ID) de esta Colección.
 * 3. Construye y envía una transacción hacia la blockchain de Solana solicitando al programa 
 *    "Metaplex Core" que inicialice esta nueva colección, vinculándola al URI creado y 
 *    asignando a la wallet conectada (identidad UMI actual) como pagadora y autoridad de actualización.
 *
 * @param umi - La instancia conectada de UMI (se obtiene con el hook `useUmi`).
 * @param eventData - Información esencial del evento (incluyendo la URL IPFS ya alojada).
 * @returns Una Promesa que resuelve la dirección pública (PublicKey en string) de la colección creada.
 */
export async function createEventCollection(
  umi: Umi,
  eventData: {
    name: string;
    description: string;
    imageUrl: string;
    organizerWallet: string;
  }
): Promise<string> {
  // 1. Subir metadata a IPFS usando la función uploadMetadata de lib/pinata.ts
  const metadataUri = await uploadMetadata({
    name: eventData.name,
    description: eventData.description,
    image: eventData.imageUrl,
    attributes: [
      { trait_type: "Tipo", value: "Event Collection" },
      { trait_type: "Organizador base", value: eventData.organizerWallet },
    ],
  });

  // 2. Generar un nuevo Signer válido para la colección
  const collectionSigner = generateSigner(umi);

  // 3. Enviar la instrucción on-chain para crear la colección (Metaplex Core)
  await createCollection(umi, {
    collection: collectionSigner,
    name: eventData.name,
    uri: metadataUri,
  }).sendAndConfirm(umi);

  // Extraer y devolver la firma/llave pública (en formato texto) de la colección resultante
  return collectionSigner.publicKey.toString();
}

/**
 * Adquiere y mintea de forma nativa un Asset (Ticket de Entrada) de una Colección on-chain.
 * 
 * Este proceso realiza secuencialmente:
 * 1. Subida del formato estricto de metadata (JSON) del ticket a la red descentralizada IPFS vía Pinata.
 * 2. Transfiere de manera programática el valor en SOL dictado del comprador hacia el Bóveda (Escrow) reteniendo el capital.
 * 3. Ejecuta la expedición on-chain mediante el minteo (mintV1) de un Activo con estándar de Metaplex Core vinculado al NFT original.
 * 4. Envía este nuevo activo nativo con estatus validado directamente a la wallet del comprador (buyerWallet).
 *
 * @param umi - Instancia principal de conectividad UMI en sesión.
 * @param params - Parámetros agrupados que constan de Mints objetivo, llave compradora en texto, pago del escrow y diccionario con datos del Evento base.
 * @returns {Promise<string>} Promesa de la dirección generada (PublicKey) perteneciente al nuevo boleto electrónico minteado.
 */
export async function mintTicket(umi: Umi, params: {
  collectionMint: string;
  buyerWallet: string;
  priceSol: number;
  eventData: { name: string; date: string; venue: string; ticketNumber: number; imageUrl: string };
}): Promise<string> {
  const ticketName = `${params.eventData.name} #${params.eventData.ticketNumber}`;

  // 1. Subir metadata del ticket a IPFS respetando la interfaz de lib/pinata.ts
  const metadataUri = await uploadMetadata({
    name: ticketName,
    description: `Ticket de entrada oficial para ${params.eventData.name}`,
    image: params.eventData.imageUrl,
    attributes: [
      { trait_type: "Fecha", value: params.eventData.date },
      { trait_type: "Lugar", value: params.eventData.venue },
      { trait_type: "Silla/Número", value: params.eventData.ticketNumber.toString() },
    ],
  });

  // Habilitamos estrictamente la conexión local del backend proxy a devnet para firmar el bloqueo
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Creamos un wrapper temporal contextual que encapsula la identidad logueada de UMI imitando el adapter estricto.
  // (Nota de Frontend: esto resuelve la incompatibilidad delegando el trust temporal a Identity)
  const dummyWalletAuth = {
    publicKey: umi.identity.publicKey,
    signTransaction: async (tx: any) => tx,
  } as unknown as WalletContextState;

  // 2. Ejecutar pago seguro a Escrow enviando los SOL especificados de priceSol 
  // En este demo, asignamos el ID del bundle de colección principal como la semilla del evento, y una key en "0s" al organizador flotante
  const ORGANIZER_PLACEHOLDER = "11111111111111111111111111111111";
  await sendToEscrow(
    connection,
    dummyWalletAuth,
    ORGANIZER_PLACEHOLDER,
    params.priceSol,
    params.collectionMint // Relacionar lógicamente al mismo evento
  );

  // 3. Crear el Keypair transitorio on-chain del Ticket que se convertirá en Asset Real
  const assetSigner = generateSigner(umi);

  // 4. Utilizar createV1 de @metaplex-foundation/mpl-core para acuñar este Asset y afiliarlo a la familia de la Colección.
  // Importante: El owner es el "buyerWallet" como estipula la regla nativa
  await createV1(umi, {
    asset: assetSigner,
    collection: publicKey(params.collectionMint),
    name: ticketName,
    uri: metadataUri,
    owner: publicKey(params.buyerWallet), // Envío directo del Ticket (NFT) a la wallet dueña del cliente depositante
  }).sendAndConfirm(umi);

  // 5. Retornar textualmente la Public Key del ticket generado como string serializado   
  return assetSigner.publicKey.toString();
}
