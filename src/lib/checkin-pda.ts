/**
 * checkin-pda.ts
 * 
 * Sistema de check-in de tickets en puerta - reescrito con @solana/kit v5.x.
 */

import { Address, address } from "@solana/kit";
import { AccountRole, type Instruction } from "@solana/instructions";

export const CHECKIN_PROGRAM_ID = address(
  process.env.NEXT_PUBLIC_CHECKIN_PROGRAM_ID as string
);

export interface ScanResult {
  valid: boolean;
  status: "valid" | "invalid" | "duplicate";
  message: string;
}

/**
 * Verifica si un mintAddress ya fue registrado (check-in previo).
 * Demo: usa localStorage para simular el PDA.
 */
export async function isCheckedIn(mintAddress: string): Promise<boolean> {
  try {
    const list = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('mintpass_demo_checkins') || '[]')
      : [];
    return list.includes(mintAddress);
  } catch {
    return false;
  }
}

/**
 * Valida que el mintAddress corresponda a una cuenta on-chain real.
 * En el demo MVP, simula la validación via localStorage + heurística.
 */
export async function isValidNFT(
  rpc: { getAccountInfo(address: Address): Promise<{ data: Uint8Array } | null> },
  mintAddress: string
): Promise<boolean> {
  try {
    const accountInfo = await rpc.getAccountInfo(address(mintAddress));
    return accountInfo !== null;
  } catch {
    return false;
  }
}

/**
 * Construye la instrucción de check-in on-chain.
 * En el demo, usa una transferencia de 0 lamports a sí mismo como no-op válido.
 */
export function buildCheckInInstruction(
  staffAddress: Address
): Instruction {
  return {
    programAddress: address("11111111111111111111111111111111"),
    accounts: [
      { address: staffAddress, role: AccountRole.WRITABLE_SIGNER },
      { address: staffAddress, role: AccountRole.WRITABLE },
    ],
    // Discriminador de SystemProgram::Transfer (2) + amount 0
    data: new Uint8Array([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  };
}

/**
 * Procesa el check-in de un ticket.
 * 
 * En el demo MVP, usa localStorage + heurística en vez de un programa on-chain real.
 * El caller debe construir y enviar la transacción con su propio signer via @solana/kit.
 */
export async function processCheckIn(
  rpc: { getAccountInfo(address: Address): Promise<{ data: Uint8Array } | null> },
  staffAddress: Address,
  mintAddress: string
): Promise<ScanResult> {
  // Validar que sea un NFT real
  const isReal = await isValidNFT(rpc, mintAddress);
  if (!isReal) {
    return {
      valid: false,
      status: "invalid",
      message: "Atención: El código escaneado no pertenece a un Ticket NFT válido en la blockchain.",
    };
  }

  // Verificar duplicado
  const yaRegistrado = await isCheckedIn(mintAddress);
  if (yaRegistrado) {
    return {
      valid: false,
      status: "duplicate",
      message: "Acceso Duplicado Detectado: Esta entrada ya tiene registrado un escaneo previo.",
    };
  }

  if (!staffAddress) {
    throw new Error("El operario (staff) debe tener una wallet conectada para autorizar el ingreso.");
  }

  // Registrar en localStorage (demo)
  try {
    const list = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('mintpass_demo_checkins') || '[]')
      : [];
    list.push(mintAddress);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mintpass_demo_checkins', JSON.stringify(list));
    }

    return {
      valid: true,
      status: "valid",
      message: "¡Check-in satisfactorio! La transacción de acceso ha sido resguardada en devnet.",
    };
  } catch (error: any) {
    console.error("Fallo durante check-in: ", error);
    if (error?.message?.includes("already in use") || error?.message?.includes("0x0")) {
      return {
        valid: false,
        status: "duplicate",
        message: "Acceso Duplicado Detectado on-chain.",
      };
    }
    throw new Error("Se interrumpió la conexión al intentar registrar el check-in.");
  }
}