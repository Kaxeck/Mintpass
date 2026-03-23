import { generateSigner, Umi, publicKey, createSignerFromKeypair } from "@metaplex-foundation/umi";
import { createCollection, createV1, update, fetchAsset } from "@metaplex-foundation/mpl-core";
import { uploadMetadata } from "./pinata";
import { sendToEscrow } from "./escrow";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

/**
 * Master Delegated Authority (Mockup de Backend)
 * Usamos una semilla determinística de 32 bytes para generar siempre el mismo Keypair maestro en devnet.
 * Esta Authority permite validar públicamente que los NFTs fueron minteados por la aplicación,
 * simulando un entorno de servidor cerrado.
 */
const APP_MASTER_SEED = new Uint8Array([
  25, 118, 43, 9, 210, 56, 102, 199, 44, 18, 93, 201, 74, 15, 88, 30,
  145, 62, 8, 233, 111, 77, 10, 51, 108, 4, 135, 96, 23, 114, 82, 19
]);

/**
 * Genera el Signer Maestro que simulará al servidor firmando operaciones de Colección restringidas.
 */
function getMasterSigner(umi: Umi) {
  const masterKeypair = umi.eddsa.createKeypairFromSeed(APP_MASTER_SEED);
  return createSignerFromKeypair(umi, masterKeypair);
}

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

  // 3. Enviar la instrucción on-chain para crear la colección delegando la Update Authority al Backend
  const appMasterSigner = getMasterSigner(umi);

  await createCollection(umi, {
    collection: collectionSigner,
    name: eventData.name,
    uri: metadataUri,
    updateAuthority: appMasterSigner.publicKey, // El Backend administra la colección
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
  buyerWalletObj: WalletContextState;
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

  // 2. Ejecutar pago seguro a Escrow enviando los SOL especificados de priceSol 
  // En este demo, asignamos el ID del bundle de colección principal como la semilla del evento, y una key en "0s" al organizador flotante
  const ORGANIZER_PLACEHOLDER = "11111111111111111111111111111111";
  await sendToEscrow(
    connection,
    params.buyerWalletObj,
    ORGANIZER_PLACEHOLDER,
    params.priceSol,
    params.collectionMint // Relacionar lógicamente al mismo evento
  );

  // 3. Crear el Keypair transitorio on-chain del Ticket que se convertirá en Asset Real
  const assetSigner = generateSigner(umi);

  // 4. Utilizar createV1 de @metaplex-foundation/mpl-core para acuñar este Asset.
  // Ahora Inyectamos el Asset DENTRO de la Colección usando la Firma del Master Signer del Backend.
  const appMasterSigner = getMasterSigner(umi);

  await createV1(umi, {
    asset: assetSigner,
    collection: publicKey(params.collectionMint),
    name: ticketName,
    uri: metadataUri,
    owner: publicKey(params.buyerWalletObj.publicKey!.toBase58()), // Envío directo a la wallet del cliente
    authority: appMasterSigner, // Firma del servidor autorizando que este Asset entre a la colección
  }).sendAndConfirm(umi);

  // 5. Retornar textualmente la Public Key del ticket generado como string serializado   
  return assetSigner.publicKey.toString();
}

/**
 * Evoluciona un Asset (Ticket) previamente minteado para convertirlo en un POAP (Proof of Attendance Protocol).
 *
 * Esta función se ejecuta típicamente después del check-in del usuario:
 * 1. Genera un nuevo archivo JSON de metadatos apuntando a la nueva imagen y atributos honoríficos del POAP final.
 * 2. Lo sube de forma nativa e inmutable empleando el proveedor configurado (Pinata IPFS).
 * 3. Actualiza el Asset original en la cadena Solana mediante la instrucción `update` de Metaplex Core,
 *    cruzando la metadata on-chain hacia la nueva URI off-chain.
 * El activo subyacente sigue siendo exactamente el mismo criptográficamente (mantiene su address base y owner).
 *
 * @param umi - Cliente UMI conectado que posea la autoridad de actualización del Asset (Update Authority/Colección).
 * @param params - Parámetros agrupados que referencian el Mint, los datos definitivos del evento tras finalizar y la url de la estampilla POAP.
 * @returns {Promise<void>} Una promesa silenciada que se resuelve incondicionalmente al confirmar la firma off-chain y on-chain.
 */
export async function mutateToPoap(
  umi: Umi,
  params: {
    mintAddress: string;
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
  // Construcción del title descriptivo del logro POAP
  const poapName = `POAP — ${params.eventData.name} · ${params.eventData.date}`;

  // 1. Empaquetar y subir la nueva metadata inyectando el valor de asistencia corroborada a IPFS
  const newMetadataUri = await uploadMetadata({
    name: poapName,
    description: `Este digital coleccionable POAP verifica la participación asistida y confirmada en: ${params.eventData.name}.`,
    image: params.poapImageUrl,
    attributes: [
      { trait_type: "Tipo", value: "POAP" },
      { trait_type: "Fecha", value: params.eventData.date },
      { trait_type: "Lugar", value: params.eventData.venue },
      { 
        trait_type: "Asistente", 
        value: `#${params.eventData.ticketNumber} de ${params.eventData.totalAttendees}` 
      },
      { trait_type: "Verificado", value: "true" },
    ],
  });

  // 2. Transmitir el mutation update a nivel blockchain (Metaplex Core)
  // Solo la Update Authority (que típicamente es el publicador de la Colección conectada en UMI) podrá ejecutarlo on-chain.
  // mpl-core requiere el objeto Asset (o parcial con owner/publicKey) para derivaciones internas.
  const coreAsset = await fetchAsset(umi, publicKey(params.mintAddress));

  await update(umi, {
    asset: coreAsset,
    name: poapName,
    uri: newMetadataUri,
  }).sendAndConfirm(umi);
}

// TODO: Modificar con la dirección pública (PROGRAM_ID) verdadera de tu Smart Contract de Reputación
const REPUTATION_PROGRAM_ID = new PublicKey("79i2AbYFRQUj5gSStpvoJ51QSYcSwcN3dp6Jyrv13g6j");

/**
 * Modifica o inicializa la reputación inmutable de un organizador en la blockchain interactuando con su PDA.
 *
 * Reglas de negocio On-Chain invocadas:
 * - Suma 10 puntos si un evento finaliza con éxito ("success").
 * - Resta 20 puntos si el evento es cancelado abruptamente ("cancel").
 * - Si la cuenta PDA (score global) no existe aún en la red, el Smart Contract asume un valor de 0 inicializándolo junto con el delta aplicado.
 *
 * @param connection - Instancia de conexión a la red de devnet.
 * @param organizerWallet - Interfaz de la wallet conectada que firmará y ejecutará la transacción.
 * @param result - Calificador del flujo del evento ("success" o "cancel").
 * @returns {Promise<void>} Transacción validada correctamente.
 */
export async function updateOrganizerReputation(
  connection: Connection,
  organizerWallet: WalletContextState,
  result: "success" | "cancel"
): Promise<void> {
  if (!organizerWallet.publicKey || !organizerWallet.signTransaction) {
    throw new Error("Transacción denegada: La firma electrónica de la wallet organizadora es necesaria.");
  }

  // Se deriva la PDA inyectando el seed "reputation" sumado al buffer de la llave del organizador
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), organizerWallet.publicKey.toBuffer()],
    REPUTATION_PROGRAM_ID
  );

  // Formulamos el buffer de datos para instruir al Programa a aplicar la matemática respectiva
  // (En aplicaciones de Anchor, esto se hace serializando Borsh, ahora lo envuelve un JSON emulado).
  const payloadBuffer = Buffer.from(
    JSON.stringify({ 
      action: "update_score", 
      result: result // El smart contract luego sumará 10 o restará 20
    })
  );

  const instruction = new TransactionInstruction({
    programId: REPUTATION_PROGRAM_ID,
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

  const signedTx = await organizerWallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature, "confirmed");
}

/**
 * Consulta de forma descentralizada el puntaje histórico de reputación leyendo la PDA del organizador.
 * Al usar getAccountInfo es extremadamente rápida, nativa y libre de costos (fees).
 * 
 * @param connection - Instancia de conectores RPC de devnet.
 * @param organizerWallet - String de la dirección pública objetivo del organizador analizado.
 * @returns {Promise<number>} El puntaje actual exacto del organizador o bien 0 preventivo si no cuenta con registros.
 */
export async function getOrganizerReputation(
  connection: Connection,
  organizerWallet: string
): Promise<number> {
  try {
    const organizerPubkey = new PublicKey(organizerWallet);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), organizerPubkey.toBuffer()],
      REPUTATION_PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(pda);
    
    // Si la lectura retorna null o metadata vacía, significa que la PDA aún no se inicializó. Su score es 0
    if (!accountInfo || !accountInfo.data) {
      return 0;
    }

    // Leemos el score extrayendo los bytes nativos almacenados.
    const payload = accountInfo.data.toString("utf8");
    try {
      // Usaremos un parseo dinámico como sustituto del tipado IDL subyacente de Anchor
      const parsed = JSON.parse(payload);
      return typeof parsed.score === "number" ? parsed.score : 0;
    } catch {
      // Si la codificación en blockchain no fue JSON, protegemos la UI devolviendo 0 o evaluando parseInt
      return 0; 
    }
  } catch (e) {
    console.error("Fallo on-chain detectando el perfil de reputación de organizador:", e);
    return 0;
  }
}
