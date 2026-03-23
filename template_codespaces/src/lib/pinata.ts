export interface NFTMetadata {
  name: string;
  description: string;
  image: string;       // URL de IPFS de la imagen
  attributes: Array<{ trait_type: string; value: string }>;
}

export async function uploadEventImage(file: File): Promise<string> {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        pinata_api_key: import.meta.env.VITE_PINATA_API_KEY ?? "",
        pinata_secret_api_key: import.meta.env.VITE_PINATA_SECRET_KEY ?? "",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Fallo en la comunicación con Pinata: ${response.statusText}`);
    }

    interface PinataResponse {
      IpfsHash: string;
      PinSize: number;
      Timestamp: string;
    }

    const data = (await response.json()) as PinataResponse;
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  } catch (error) {
    console.error("Error en uploadEventImage:", error);
    // Lanzamos un error explícito en español como fue solicitado
    throw new Error("Ocurrió un error al subir la imagen a Pinata");
  }
}
export async function uploadMetadata(_metadata: NFTMetadata): Promise<string> {
  console.log("Subida a IPFS desactivada.");
  return "https://gateway.pinata.cloud/ipfs/QmDummyHashForTestingMetadatosLocales123";
}
