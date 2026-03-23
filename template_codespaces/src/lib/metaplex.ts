import { generateSigner, Umi } from "@metaplex-foundation/umi";
import { createCollection } from "@metaplex-foundation/mpl-core";
import { uploadMetadata } from "./pinata";

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
