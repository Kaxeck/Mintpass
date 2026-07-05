/**
 * escrow.ts
 * 
 * Módulo de Escrow para Mintpass — reescrito con @solana/kit v5.x.
 * 
 * Gestiona transferencias de SOL desde el comprador hacia una bóveda (escrow vault)
 * y la liberación de fondos hacia el organizador.
 */

import {
  Address,
  getAddressDecoder,
  createKeyPairFromBytes,
} from "@solana/kit";
import { AccountRole, type Instruction } from "@solana/instructions";

const SYSTEM_PROGRAM: Address = "11111111111111111111111111111111" as Address;

// La semilla se lee desde .env.local (NEXT_PUBLIC_APP_MASTER_SEED)
function getAppMasterSeed(): Uint8Array {
  const envSeed = process.env.NEXT_PUBLIC_APP_MASTER_SEED;
  if (!envSeed) {
    throw new Error("❌ NEXT_PUBLIC_APP_MASTER_SEED no configurada en .env.local");
  }
  return new Uint8Array(envSeed.split(',').map(Number));
}

/**
 * Obtiene la dirección (Address) de la bóveda maestra desde la semilla.
 */
export async function getEscrowVaultAddress(): Promise<Address> {
  const seed = getAppMasterSeed();
  const keyPair = await createKeyPairFromBytes(seed, false);
  const rawPub = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  return getAddressDecoder().decode(new Uint8Array(rawPub));
}

/**
 * Construye una instrucción de transferencia SOL.
 * Usa el formato raw de @solana/kit (Instruction con AccountRole).
 * 
 * El caller DEBE asegurar que `source` firme la transacción 
 * (agregarlo como TransactionSigner al compilar).
 */
function buildTransferInstruction(
  source: Address,
  destination: Address,
  lamports: bigint
): Instruction {
  // Discriminador del System Program para Transfer: 2 (u32 LE)
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true); // discriminator
  view.setBigUint64(4, lamports, true); // amount

  return {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      { address: source, role: AccountRole.WRITABLE_SIGNER },
      { address: destination, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

/**
 * Construye la instrucción de transferencia SOL hacia la bóveda escrow.
 * 
 * @param buyerAddress - Dirección del comprador (DEBE ser signer de la tx)
 * @param amountSol - Cantidad de SOL a transferir
 * @returns La instrucción y la dirección de la bóveda
 */
export async function createEscrowTransferInstruction(
  buyerAddress: Address,
  amountSol: number
): Promise<{ instruction: Instruction; vaultAddress: Address }> {
  const vaultAddress = await getEscrowVaultAddress();

  if (amountSol <= 0) {
    return {
      instruction: buildTransferInstruction(buyerAddress, buyerAddress, 0n),
      vaultAddress,
    };
  }

  const lamports = BigInt(Math.floor(amountSol * 1_000_000_000));
  return {
    instruction: buildTransferInstruction(buyerAddress, vaultAddress, lamports),
    vaultAddress,
  };
}

/**
 * Construye la instrucción para liberar fondos del escrow hacia el organizador.
 * 
 * NOTA: La vault NO es signer automáticamente. El caller debe agregar la firma
 * de la vault usando un signer apropiado (ej. partialSign con la master key).
 * 
 * @param organizerAddress - Dirección del organizador
 * @param amountSol - Cantidad de SOL a liberar
 * @returns La instrucción o null si es gratis
 */
export async function createEscrowReleaseInstruction(
  organizerAddress: Address,
  amountSol: number
): Promise<Instruction | null> {
  if (amountSol <= 0) return null;

  const lamports = BigInt(Math.floor(amountSol * 1_000_000_000));
  const vaultAddress = await getEscrowVaultAddress();

  return buildTransferInstruction(vaultAddress, organizerAddress, lamports);
}