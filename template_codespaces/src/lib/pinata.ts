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

export async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: import.meta.env.VITE_PINATA_API_KEY ?? "",
        pinata_secret_api_key: import.meta.env.VITE_PINATA_SECRET_KEY ?? "",
      },
      // Al usar pinJSONToIPFS, envolvemos el objeto en pinataContent para que asigne metadata extra.
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.name.replace(/\s+/g, "_")}_metadata.json`,
        },
      }),
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
    console.error("Error en uploadMetadata:", error);
    // Lanzamos un error explícito en español
    throw new Error("Ocurrió un error al subir los metadatos JSON a Pinata");
  }
}
