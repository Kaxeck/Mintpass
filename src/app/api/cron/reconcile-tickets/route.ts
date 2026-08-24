import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const maxDuration = 60; // Max execution time for Vercel Hobby

export async function GET(req: Request) {
  try {
    // Validate Cron Secret if configured
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!rpcUrl) {
      return NextResponse.json({ error: "RPC URL not configured" }, { status: 500 });
    }

    // 1. Get all published events with collection mints
    const events = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        collectionMint: { not: null }
      }
    });

    let totalReconciled = 0;
    let totalCreated = 0;
    let errors = [];

    // 2. Process each event
    for (const event of events) {
      try {
        let page = 1;
        let hasMore = true;
        let allAssets: any[] = [];

        // Paginate through Helius DAS API
        while (hasMore) {
          const response = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: `reconcile-${event.id}`,
              method: "getAssetsByGroup",
              params: {
                groupKey: "collection",
                groupValue: event.collectionMint,
                page: page,
                limit: 1000
              }
            })
          });

          const data = await response.json();
          if (data.error) {
            console.error("DAS API Error:", data.error);
            hasMore = false;
            break;
          }

          const assets = data.result?.items || [];
          allAssets = allAssets.concat(assets);

          if (assets.length < 1000) {
            hasMore = false;
          } else {
            page++;
          }
        }

        // 3. Compare with database
        for (const asset of allAssets) {
          const mintAddress = asset.id;
          const ownerPubkey = asset.ownership?.owner;
          
          let parsedNumber = null;
          const name = asset.content?.metadata?.name || "";
          const match = name.match(/#(\d+)$/);
          if (match) {
             parsedNumber = parseInt(match[1], 10);
          }

          if (!mintAddress || !ownerPubkey) continue;

          // Check if ticket exists in DB
          const existingTicket = await prisma.ticket.findUnique({
            where: { mintAddress }
          });

          if (existingTicket) {
            // Reconcile pending tickets
            if (existingTicket.status === "PENDING_ON_CHAIN") {
              await prisma.ticket.update({
                where: { mintAddress },
                data: { status: "VALID", ownerPubkey, ticketNumber: parsedNumber }
              });
              
              await prisma.ticketAuditLog.create({
                data: {
                  ticketMint: mintAddress,
                  previousStatus: "PENDING_ON_CHAIN",
                  newStatus: "VALID",
                  changedAtSlot: 0,
                  txSignature: "cron_reconciliation",
                }
              });
              totalReconciled++;
            } else if (!existingTicket.ticketNumber || !existingTicket.metadataUri) {
              // Retroactively fix missing data for older tickets
              await prisma.ticket.update({
                where: { mintAddress },
                data: { 
                  ticketNumber: parsedNumber,
                  metadataUri: asset.content?.json_uri || undefined
                }
              });

              // Also check if they are missing their initial audit log
              const logCount = await prisma.ticketAuditLog.count({
                where: { ticketMint: mintAddress }
              });
              if (logCount === 0) {
                await prisma.ticketAuditLog.create({
                  data: {
                    ticketMint: mintAddress,
                    previousStatus: null,
                    newStatus: existingTicket.status,
                    changedAtSlot: 0,
                    txSignature: "cron_retroactive_genesis",
                  }
                });
              }
            }
          } else {
            // Ticket missing in DB (bought via Blink or contract) -> Create it
            await prisma.ticket.create({
              data: {
                mintAddress,
                eventAddress: event.address || event.id,
                ownerPubkey,
                originalBuyerPubkey: ownerPubkey,
                status: "VALID",
                zoneIndex: 0, // Default for now unless we fetch traits from DAS
                ticketNumber: parsedNumber,
                metadataUri: asset.content?.json_uri || undefined,
                originalPrice: event.ticketPriceSol || 0,
                pricePaid: event.ticketPriceSol || 0,
                lastSyncedSlot: 0,
              }
            });

            await prisma.ticketAuditLog.create({
              data: {
                ticketMint: mintAddress,
                previousStatus: null,
                newStatus: "VALID",
                changedAtSlot: 0,
                txSignature: "cron_creation",
              }
            });
            totalCreated++;
          }
        }

      } catch (err: any) {
        console.error(`Error reconciling event ${event.id}:`, err);
        errors.push({ eventId: event.id, message: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reconciliation completed",
      stats: {
        eventsProcessed: events.length,
        ticketsReconciled: totalReconciled,
        ticketsCreated: totalCreated,
        errors: errors.length
      }
    });

  } catch (error: any) {
    console.error("Cron reconciliation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
