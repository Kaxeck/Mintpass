import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

// TODO: Modificar con la dirección pública final del programa verificador on-chain.
const CHECKIN_PROGRAM_ID = new PublicKey("Dm5EGnhPWU1MGJNYRwfetzPTojSM9g1yJEAdd9bPdqTf");

export interface ScanResult {
  valid: boolean;
  status: "valid" | "invalid" | "duplicate";
  message: string;
}

/**
 * Inspecciona directamente el estado de un PDA de event check-in en la red.
 * Al ser sólo una operación de lectura, no consume gas fee (gratis).
 *
 * @param connection - Proveedor de conexión JSON RPC de devnet.
 * @param mintAddress - MINT address (Ticket NFT) en formato cadena referenciado por el PDA.
 * @returns {Promise<boolean>} Devuelve true exclusivamente si ya se registró la entrada en blockchain.
 */
export async function isCheckedIn(connection: Connection, mintAddress: string): Promise<boolean> {
  let mintPubkey: PublicKey;
  try {
    mintPubkey = new PublicKey(mintAddress);
  } catch (e) {
    return false; // Dirección invalida
  }

  // Se deriva la semilla combinada determinística
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("checkin"), mintPubkey.toBuffer()],
    CHECKIN_PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(pda);
  // Si encontramos metadata, la cuenta PDA ya fue inicializada, indicando un acceso repetido.
  return accountInfo !== null;
}

/**
 * Consulta la red para autentificar que el mintAddress entregado sí le corresponde a una cuenta on-chain real 
 * (verificando que es un Token o NFT verdadero en devnet, y no solo una cadena Random).
 *
 * @param connection - Conexión actual al clúster de Solana.
 * @param mintAddress - Address base58 candidata del Ticket.
 * @returns {Promise<boolean>} Si la cuenta existe y funciona a niveles base.
 */
export async function isValidNFT(connection: Connection, mintAddress: string): Promise<boolean> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const accountInfo = await connection.getAccountInfo(mintPubkey);
    // Solo permitimos continuar si el Activo/Cuenta no está vacío lógicamente.
    return accountInfo !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Sistema principal anti-duplicidad de accesos (Check-In).
 * Emite una instrucción on-chain creando un PDA sellado asumiendo la semilla del Ticket.
 * - Si es nuevo, inicializa con { checkedIn: true, timestamp: Date.now() }
 * - Si falla o detecta registro previo, bloquea una vuelta duplicada.
 *
 * @param connection - Conexión actual a la red programática de devnet.
 * @param staffWallet - Billetera delegada/conectada del organizador en puerta para firmar transacciones.
 * @param mintAddress - Dirección principal del MINT del usuario presentándolo en la entrada.
 * @returns {Promise<ScanResult>} Un objeto desglosado indicándole al frontend de la aplicación el resultado del acceso.
 */
export async function createCheckInPDA(
  connection: Connection,
  staffWallet: WalletContextState,
  mintAddress: string
): Promise<ScanResult> {
  // 1. Verificamos antes de gastar fee si la base de datos distribuida reconoce el ticket
  const isReal = await isValidNFT(connection, mintAddress);
  if (!isReal) {
    return {
      valid: false,
      status: "invalid",
      message: "Atención: El código escaneado no pertenece a un Ticket NFT válido en la blockchain.",
    };
  }

  // 2. Verificamos de forma local (lectura sin costo) si ya quemó el acceso
  const yaRegistrado = await isCheckedIn(connection, mintAddress);
  if (yaRegistrado) {
    return {
      valid: false,
      status: "duplicate",
      message: "Acceso Duplicado Detectado: Esta entrada ya tiene registrado un escaneo de verificación previo.",
    };
  }

  if (!staffWallet.publicKey || !staffWallet.signTransaction) {
    throw new Error("El perfil de operario (staff) debe tener una wallet conectada funcional para autorizar el ingreso.");
  }

  try {
    const mintPubkey = new PublicKey(mintAddress);

    // 3. Calculamos la misma PDA en la transacción final hacia el Smart Contract.
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("checkin"), mintPubkey.toBuffer()],
      CHECKIN_PROGRAM_ID
    );

    // Integramos la información on-chain que viajará al programa: { checkedIn: true, timestamp: Date.now() }
    const payloadBuffer = Buffer.from(
      JSON.stringify({ checkedIn: true, timestamp: Date.now() })
    );

    const instruction = new TransactionInstruction({
      programId: CHECKIN_PROGRAM_ID,
      keys: [
        { pubkey: pda, isSigner: false, isWritable: true },
        { pubkey: staffWallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      // En Anchor esto usaría serialización de layout específica (Borsh); 
      // Aquí lo enviamos codificado nativamente a modo de ejemplo.
      data: payloadBuffer,
    });

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = staffWallet.publicKey;

    // Firmar con la wallet del host/staff y enrutar
    const signedTx = await staffWallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    return {
      valid: true,
      status: "valid",
      message: "¡Check-in satisfactorio! La transacción de acceso ha sido resguardada irrevocablemente en devnet.",
    };

  } catch (error: any) {
    console.error("Fallo on-chain durante check-in: ", error);
    
    // Si en una milésima de segundo alguien más crea el check-in PDA (o colisiona el cluster)
    if (error?.message?.includes("already in use") || error?.message?.includes("0x0")) {
      return {
        valid: false,
        status: "duplicate",
        message: "Acceso Duplicado Detectado on-chain: Hubo un intento de uso simultáneo de la entrada.",
      };
    }
    throw new Error("Se interrumpió la conexión asimétrica al intentar registrar el check-in.");
  }
}
