import { SignJWT, jwtVerify } from "jose";

// Using a static secret for now; in a real scenario, this would be an environment variable
// e.g., new TextEncoder().encode(import.meta.env.VITE_JWT_SECRET)
const JWT_SECRET = new TextEncoder().encode(
  "my_super_secret_jwt_key_for_mintpass"
);

/**
 * Generates a JWT payload for a QR code that expires in 30 seconds.
 * 
 * @param mintAddress - The NFT Mint Address.
 * @param walletAddress - The owner's Wallet Address.
 * @returns A signed JWT string to be encoded in a QR.
 */
export async function generateQRPayload(
  mintAddress: string,
  walletAddress: string
): Promise<string> {
  // Sign a JWT with a 30s expiration
  const jwt = await new SignJWT({ mintAddress, walletAddress })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30s")
    .sign(JWT_SECRET);

  return jwt;
}

/**
 * Simulates Persona A: Checks if an NFT is valid on-chain.
 * Replace with actual Solana / Anchor program logic.
 */
export async function isValidNFT(mintAddress: string): Promise<boolean> {
  // Mock validation: assume all NFTs are valid for this demo
  console.log(`[Persona A] Checking if NFT ${mintAddress} is valid on-chain...`);
  return true;
}

/**
 * Simulates Persona A: Checks if a Check-in PDA exists for a given mint.
 * Replace with actual Solana / Anchor program logic.
 */
export async function isCheckedIn(mintAddress: string): Promise<boolean> {
  // Mock check-in status: assume PDA doesn't exist yet
  console.log(`[Persona A] Checking if check-in PDA exists for ${mintAddress}...`);
  return false;
}

/**
 * Simulates Persona A: Creates the Check-in PDA to mark the ticket as used.
 * Replace with actual Solana / Anchor program logic.
 */
export async function createCheckInPDA(mintAddress: string): Promise<boolean> {
  console.log(`[Persona A] Creating check-in PDA for ${mintAddress}...`);
  return true;
}

/**
 * Verifies a scanned QR code (JWT string).
 * 
 * Flow:
 * 1. Cryptographically verify signature and expiration.
 * 2. Simulate checking on-chain possession.
 * 3. Simulate checking if PDA exists.
 * 
 * @param jwtString - The JWT text scanned from the QR code.
 * @returns Status of the verification.
 */
export async function verifyQR(jwtString: string): Promise<{
  valid: boolean;
  statusType: "valid" | "invalid" | "duplicate";
  message: string;
  data?: any;
}> {
  try {
    // 1. Verify Signature and Expiration using jose
    const { payload } = await jwtVerify(jwtString, JWT_SECRET);

    const mintAddress = payload.mintAddress as string;
    
    // 2. Check if NFT is valid on-chain
    const isNftValid = await isValidNFT(mintAddress);
    if (!isNftValid) {
      return {
        valid: false,
        statusType: "invalid",
        message: "NFT no encontrado o inválido."
      };
    }

    // 3. Check if PDA exists (Duplicate check)
    const alreadyCheckedIn = await isCheckedIn(mintAddress);
    if (alreadyCheckedIn) {
      return {
        valid: false,
        statusType: "duplicate",
        message: "Este ticket ya fue escaneado antes."
      };
    }

    // Additional step to mark as checked-in (could be decoupled)
    await createCheckInPDA(mintAddress);

    return {
      valid: true,
      statusType: "valid",
      message: "Ticket validado correctamente.",
      data: payload
    };

  } catch (error: any) {
    // Distinguish between expired vs modified signatures
    if (error?.code === "ERR_JWT_EXPIRED") {
      return {
        valid: false,
        statusType: "invalid",
        message: "El código QR ha expirado (más de 30 segundos)."
      };
    }

    return {
      valid: false,
      statusType: "invalid",
      message: "El código QR no es válido o ha sido modificado."
    };
  }
}
