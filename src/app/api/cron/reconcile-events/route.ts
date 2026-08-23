import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Connection } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { MINTPASS_IDL } from "@/lib/anchor";
import bs58 from "bs58";

export const maxDuration = 60; // Max execution time for Vercel

export async function GET(req: Request) {
  try {
    // 1. Validate Cron Secret
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!rpcUrl) {
      return NextResponse.json({ error: "RPC URL not configured" }, { status: 500 });
    }

    // 2. Setup Anchor Program
    const connection = new Connection(rpcUrl, "confirmed");
    const provider = new AnchorProvider(connection, {} as any, { commitment: "confirmed" });
    const program = new Program(MINTPASS_IDL as any, provider);

    // 3. Fetch all EventRecords from blockchain
    let onChainEvents;
    try {
      onChainEvents = await (program.account as any).eventRecord.all();
    } catch (e: any) {
      console.error("Failed to fetch events from blockchain:", e);
      return NextResponse.json({ error: "Failed to fetch on-chain events" }, { status: 500 });
    }

    let totalReconciled = 0;
    let totalCreated = 0;
    let errors = [];

    // 4. Reconcile with DB
    for (const chainEvent of onChainEvents) {
      try {
        const address = chainEvent.publicKey.toString();
        const account = chainEvent.account as any;
        
        const organizerPubkey = account.organizer.toString();
        const collectionMint = account.collectionMint.toString();
        
        // Find existing event in DB by address
        const existingEvent = await prisma.event.findUnique({
          where: { address }
        });

        if (existingEvent) {
          // Reconcile pending event
          if (existingEvent.status === "PENDING_ON_CHAIN") {
            await prisma.event.update({
              where: { address },
              data: { status: "PUBLISHED", collectionMint }
            });
            totalReconciled++;
          }
        } else {
          // Check if there's a draft that just missed the PDA update by collectionMint
          // Highly unlikely for external blinks, but just in case
          const existingDraftByMint = await prisma.event.findFirst({
            where: { collectionMint }
          });

          if (existingDraftByMint) {
             await prisma.event.update({
               where: { id: existingDraftByMint.id },
               data: { address, status: "PUBLISHED" }
             });
             totalReconciled++;
          } else {
            // Event completely missing (created by external contract call)
            await prisma.event.create({
              data: {
                address,
                status: "PUBLISHED",
                collectionMint,
                organizerPubkey,
                title: account.name || "Evento Reconciliado",
                description: account.description || "",
                category: account.category || "General",
                ticketPriceSol: 0, // Fallback if not available directly
                capacity: 0,
                // Escrow vault could be derived, but leaving null for now
              }
            });
            totalCreated++;
          }
        }
      } catch (err: any) {
        console.error(`Error reconciling event ${chainEvent.publicKey.toString()}:`, err);
        errors.push({ address: chainEvent.publicKey.toString(), message: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Event reconciliation completed",
      stats: {
        eventsProcessed: onChainEvents.length,
        eventsReconciled: totalReconciled,
        eventsCreated: totalCreated,
        errors: errors.length
      }
    });

  } catch (error: any) {
    console.error("Cron event reconciliation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
