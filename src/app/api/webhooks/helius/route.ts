import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEventPublishedEmail, sendTicketPurchasedEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    
    // Validate Helius Webhook Secret
    const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;
    if (webhookSecret && authHeader !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    
    // Helius sends an array of Enriched Transactions
    if (!Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    for (const tx of payload) {
      // 1. Parse Token Transfers (Normal NFTs)
      if (tx.tokenTransfers && Array.isArray(tx.tokenTransfers)) {
        for (const transfer of tx.tokenTransfers) {
          const mint = transfer.mint;
          const toAccount = transfer.toUserAccount;
          
          if (mint && toAccount) {
            // Check if this mint is one of our Event Collections
            const event = await prisma.event.findUnique({
              where: { collectionMint: mint },
              include: { userProfile: true }
            });
            if (event && (tx.type === "NFT_MINT" || event.status === "PENDING_ON_CHAIN")) {
              await prisma.event.update({
                where: { collectionMint: mint },
                data: { status: "PUBLISHED" }
              });
              if (event.userProfile?.email) {
                await sendEventPublishedEmail(event.userProfile.email, event.title);
              }
              continue; // If it was an event, skip checking tickets
            }

            // Check if this mint is one of our tickets
            let ticket = await prisma.ticket.findUnique({
              where: { mintAddress: mint },
              include: { owner: true, event: true }
            });

            if (!ticket && tx.type === "NFT_MINT") {
              // Ticket not in DB, probably minted via Blink (100% on-chain)
              // Let's verify if it belongs to one of our events by fetching its metadata
              try {
                const { createUmi } = await import("@metaplex-foundation/umi-bundle-defaults");
                const { publicKey } = await import("@metaplex-foundation/umi");
                const { fetchDigitalAsset } = await import("@metaplex-foundation/mpl-token-metadata");
                
                const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com");
                const asset = await fetchDigitalAsset(umi, publicKey(mint));
                
                if (asset.metadata.collection.__option === 'Some' && asset.metadata.collection.value.key) {
                  const collectionMintStr = asset.metadata.collection.value.key.toString();
                  const parentEvent = await prisma.event.findUnique({ where: { collectionMint: collectionMintStr } });
                  
                  if (parentEvent) {
                    // It's a ticket for our event! Let's save it.
                    ticket = await prisma.ticket.create({
                      data: {
                        mintAddress: mint,
                        eventAddress: parentEvent.id,
                        ownerPubkey: toAccount,
                        originalBuyerPubkey: toAccount,
                        status: "VALID",
                        zoneIndex: 0,
                        originalPrice: parentEvent.ticketPriceSol || 0,
                        pricePaid: parentEvent.ticketPriceSol || 0,
                        lastSyncedSlot: tx.slot || 0,
                      },
                      include: { owner: true, event: true }
                    }) as any;
                    
                    await prisma.ticketAuditLog.create({
                      data: {
                        ticketMint: mint,
                        previousStatus: "PENDING_ON_CHAIN",
                        newStatus: "VALID",
                        changedAtSlot: tx.slot || 0,
                        txSignature: tx.signature || "mint_webhook_blink",
                      }
                    });
                    
                    if (ticket?.owner?.email && ticket?.event) {
                      const ticketUrl = `https://mintpass.com/ticket/${mint}`;
                      await sendTicketPurchasedEmail(ticket.owner.email, ticket.event.title, ticketUrl);
                    }
                  }
                }
              } catch (fetchErr) {
                console.error("Error fetching metadata for new mint in webhook:", fetchErr);
              }
            } else if (ticket) {
              if (tx.type === "NFT_MINT") {
                await prisma.ticket.update({
                  where: { mintAddress: mint },
                  data: { status: "VALID" }
                });
                await prisma.ticketAuditLog.create({
                  data: {
                    ticketMint: mint,
                    previousStatus: ticket.status,
                    newStatus: "VALID",
                    changedAtSlot: tx.slot || 0,
                    txSignature: tx.signature || "mint_webhook",
                  }
                });
                if (ticket.owner?.email && ticket.event) {
                  // A dummy URL for now, could be dynamic
                  const ticketUrl = `https://mintpass.com/ticket/${mint}`;
                  await sendTicketPurchasedEmail(ticket.owner.email, ticket.event.title, ticketUrl);
                }
              } else if (tx.type === "BURN" || toAccount === "1nc1nerator11111111111111111111111111111111") {
                // Handle Burn
                await prisma.ticket.update({
                  where: { mintAddress: mint },
                  data: { status: "CHECKED_IN" } // or REFUNDED based on logic
                });
                await prisma.ticketAuditLog.create({
                  data: {
                    ticketMint: mint,
                    previousStatus: ticket.status,
                    newStatus: "CHECKED_IN",
                    changedAtSlot: tx.slot || 0,
                    txSignature: tx.signature || "burn_webhook",
                  }
                });
              } else if (tx.type === "TRANSFER" || tx.type === "NFT_SALE") {
                // Handle Transfer
                if (ticket.ownerPubkey !== toAccount) {
                  await prisma.ticket.update({
                    where: { mintAddress: mint },
                    data: { ownerPubkey: toAccount, status: "RESOLD" }
                  });
                  await prisma.ticketAuditLog.create({
                    data: {
                      ticketMint: mint,
                      previousStatus: ticket.status,
                      newStatus: "RESOLD",
                      changedAtSlot: tx.slot || 0,
                      txSignature: tx.signature || "transfer_webhook",
                    }
                  });
                }
              }
            }
          }
        }
      }

      // 2. Parse cNFT events (Compressed NFTs)
      if (tx.events && tx.events.compressed && Array.isArray(tx.events.compressed)) {
        for (const cEvent of tx.events.compressed) {
          const assetId = cEvent.assetId;
          const toAccount = cEvent.newLeafOwner || cEvent.leafOwner;

          if (assetId) {
            const ticket = await prisma.ticket.findUnique({
              where: { mintAddress: assetId },
              include: { owner: true, event: true }
            });

            if (ticket) {
              if (tx.type === "COMPRESSED_NFT_MINT" || cEvent.type === "COMPRESSED_NFT_MINT") {
                await prisma.ticket.update({
                  where: { mintAddress: assetId },
                  data: { status: "VALID" }
                });
                await prisma.ticketAuditLog.create({
                  data: {
                    ticketMint: assetId,
                    previousStatus: ticket.status,
                    newStatus: "VALID",
                    changedAtSlot: tx.slot || 0,
                    txSignature: tx.signature || "mint_webhook",
                  }
                });
                if (ticket.owner?.email) {
                  const ticketUrl = `https://mintpass.com/ticket/${assetId}`;
                  await sendTicketPurchasedEmail(ticket.owner.email, ticket.event.title, ticketUrl);
                }
              } else if (tx.type === "COMPRESSED_NFT_BURN" || cEvent.type === "COMPRESSED_NFT_BURN") {
                await prisma.ticket.update({
                  where: { mintAddress: assetId },
                  data: { status: "CHECKED_IN" }
                });
              } else if (tx.type === "COMPRESSED_NFT_TRANSFER" || cEvent.type === "COMPRESSED_NFT_TRANSFER") {
                if (toAccount && ticket.ownerPubkey !== toAccount) {
                  await prisma.ticket.update({
                    where: { mintAddress: assetId },
                    data: { ownerPubkey: toAccount, status: "RESOLD" }
                  });
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error processing Helius webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
