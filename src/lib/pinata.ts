export interface NFTMetadata {
  name: string;
  description: string;
  image: string;       // URL de IPFS de la imagen
  attributes: Array<{ trait_type: string; value: string }>;
}

function getPinataHeaders(): Record<string, string> {
  const jwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;
  if (jwt && jwt.trim()) {
    return {
      Authorization: `Bearer ${jwt.trim()}`
    };
  }

  const apiKey = process.env.PINATA_API_KEY || process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY || process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

  if (apiKey && secretKey && apiKey.trim() && secretKey.trim()) {
    return {
      pinata_api_key: apiKey.trim(),
      pinata_secret_api_key: secretKey.trim()
    };
  }

  throw new Error("El servicio de almacenamiento IPFS (Pinata) no se encuentra configurado.");
}

export async function uploadEventImage(file: File): Promise<string> {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  const headers = getPinataHeaders();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error en la pasarela de archivos IPFS: ${response.statusText}`);
  }

  interface PinataResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
  }

  const data = (await response.json()) as PinataResponse;
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}

export async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
  const headers = getPinataHeaders();
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `mintpass_metadata_${Date.now()}.json`
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Error al almacenar metadatos en IPFS: ${response.statusText}`);
  }

  interface PinataResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
  }

  const data = (await response.json()) as PinataResponse;
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}
