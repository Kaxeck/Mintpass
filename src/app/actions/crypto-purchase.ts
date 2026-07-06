'use server';

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPublicKey, createNoopSigner, transactionBuilder, publicKeyBytes, generateSigner } from "@metaplex-foundation/umi";
import { createV1 } from "@metaplex-foundation/mpl-core";

const ESCROW_PROGRAM_ID = process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID as string;
const EVENT_COLLECTION_MINT = process.env.NEXT_PUBLIC_EVENT_COLLECTION_MINT as string;
const ORGANIZER_WALLET = process.env.NEXT_PUBLIC_ORGANIZER_WALLET as string;
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

export async function buildCryptoPurchaseTx(buyerWalletStr: string, eventSlug: string) {
  try {
    if (!ESCROW_PROGRAM_ID || !EVENT_COLLECTION_MINT || !ORGANIZER_WALLET) {
      throw new Error("Missing server environment variables for Solana configuration.");
    }

    const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com");
    
    // Set buyer as the fee payer via a NoopSigner (they will sign on the client side)
    const buyerSigner = createNoopSigner(umiPublicKey(buyerWalletStr));
    umi.payer = buyerSigner;

    // ----- PASO A: Instrucción de Escrow -----
    const [escrowPda] = umi.eddsa.findPda(umiPublicKey(ESCROW_PROGRAM_ID), [
      new Uint8Array(Buffer.from("escrow")),
      publicKeyBytes(umiPublicKey(EVENT_COLLECTION_MINT))
    ]);

    const escrowInstruction = {
      instruction: {
        programId: umiPublicKey(ESCROW_PROGRAM_ID),
        keys: [
          { pubkey: buyerSigner.publicKey, isSigner: true, isWritable: true },
          { pubkey: escrowPda, isSigner: false, isWritable: true },
          { pubkey: umiPublicKey(ORGANIZER_WALLET), isSigner: false, isWritable: false },
          { pubkey: umiPublicKey(SYSTEM_PROGRAM_ID), isSigner: false, isWritable: false },
        ],
        data: new Uint8Array(0), 
      },
      signers: [buyerSigner],
      bytesCreatedOnChain: 0
    };

    // ----- PASO B: Instrucción de Mpl-Core -----
    const assetSigner = generateSigner(umi);

    const mintBuilder = createV1(umi, {
      asset: assetSigner,
      collection: umiPublicKey(EVENT_COLLECTION_MINT),
      name: `Ticket para ${eventSlug.toUpperCase()}`,
      uri: "https://gateway.pinata.cloud/ipfs/QmTus...", // Aquí se usaría el JSON en Pinata
      owner: buyerSigner.publicKey,
    });

    // ----- PASO C: Construir Transacción -----
    let builder = transactionBuilder()
      .add(escrowInstruction)
      .add(mintBuilder);
      
    const blockhash = await umi.rpc.getLatestBlockhash();
    builder = builder.setBlockhash(blockhash);
    
    let transaction = builder.build(umi);
    
    // Partially sign with the asset signer (buyer signs later)
    transaction = await assetSigner.signTransaction(transaction);

    // Serialize to base64
    const serializedTx = umi.transactions.serialize(transaction);
    const base64Tx = Buffer.from(serializedTx).toString('base64');

    return { success: true, base64Tx, assetAddress: assetSigner.publicKey.toString() };
  } catch (error: any) {
    console.error("Error building crypto purchase tx:", error);
    return { success: false, error: error.message };
  }
}
