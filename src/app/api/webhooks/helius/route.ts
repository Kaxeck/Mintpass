import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { sendEventPublishedEmail, sendTicketPurchasedEmail } from "../../../../lib/email";
import { BorshCoder } from "@coral-xyz/anchor";
import { MINTPASS_IDL } from "../../../../lib/anchor";
import crypto from "crypto";
import bs58 from "bs58";

const EVENT_REGISTRY_PROGRAM_ID = process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID || "FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    
    // Validate Helius Webhook Secret
    const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;
    if (webhookSecret && authHeader !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    
    if (!Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const coder = new BorshCoder(MINTPASS_IDL as any);

    for (const tx of payload) {
      if (tx.transactionError) continue; // Skip failed transactions

      for (const ix of tx.instructions || []) {
        if (ix.programId === EVENT_REGISTRY_PROGRAM_ID) {
          try {
            // Decodificar los datos de la instrucción con el IDL
            const decoded = coder.instruction.decode(Buffer.from(bs58.decode(ix.data)));
            if (!decoded) continue;

            const name = decoded.name;

            if (name === "create_event") {
              const collectionMint = ix.accounts[1]; // Índice 1 es collection_mint en IDL
              
              if (collectionMint) {
                const event = await prisma.event.findUnique({
                  where: { collectionMint: collectionMint },
                  include: { userProfile: true }
                });

                if (event && event.status === "PENDING_ON_CHAIN") {
                  await prisma.event.update({
                    where: { collectionMint: collectionMint },
                    data: { status: "PUBLISHED" }
                  });
                  if (event.userProfile?.email) {
                    await sendEventPublishedEmail(event.userProfile.email, event.title);
                  }
                }
              }
            } else if (name === "buy_ticket") {
              const buyer = ix.accounts[1]; // Índice 1 es buyer
              const ticketMint = ix.accounts[2]; // Índice 2 es ticket_mint
              const collectionMint = ix.accounts[13]; // Índice 13 es collection_mint
              
              if (ticketMint && buyer && collectionMint) {
                const parentEvent = await prisma.event.findUnique({ where: { collectionMint } });
                if (parentEvent) {
                  // Buscar si el ticket ya existe (creado por frontend) o crear nuevo (vía Blink)
                  let ticket = await prisma.ticket.findUnique({
                    where: { mintAddress: ticketMint },
                    include: { owner: true, event: true }
                  });

                  const previousStatus = ticket ? ticket.status : null;

                  if (ticket) {
                    await prisma.ticket.update({
                      where: { mintAddress: ticketMint },
                      data: { 
                        status: "VALID", 
                        ownerPubkey: buyer,
                        qrSecret: crypto.randomUUID() // Rotar el secreto al cambiar de dueño
                      }
                    });
                  } else {
                    ticket = await prisma.ticket.create({
                      data: {
                        mintAddress: ticketMint,
                        eventAddress: parentEvent.address || parentEvent.id,
                        ownerPubkey: buyer,
                        originalBuyerPubkey: buyer,
                        status: "VALID",
                        zoneIndex: (decoded.data as any).zone_index || 0,
                        originalPrice: parentEvent.ticketPriceSol || 0,
                        pricePaid: parentEvent.ticketPriceSol || 0,
                        lastSyncedSlot: tx.slot || 0,
                      },
                      include: { owner: true, event: true }
                    }) as any;
                  }

                  await prisma.ticketAuditLog.create({
                    data: {
                      ticketMint: ticketMint,
                      previousStatus: previousStatus,
                      newStatus: "VALID",
                      changedAtSlot: tx.slot || 0,
                      txSignature: tx.signature || "buy_ticket_webhook",
                    }
                  });

                  if (ticket?.owner?.email && parentEvent) {
                    const ticketUrl = `https://mintpass.com/ticket/${ticketMint}`;
                    await sendTicketPurchasedEmail(ticket.owner.email, parentEvent.title, ticketUrl);
                  }
                }
              }
            } else if (name === "perform_checkin") {
              const ticketMint = ix.accounts[3]; // Índice 3 es ticket_mint
              
              if (ticketMint) {
                const ticket = await prisma.ticket.findUnique({
                  where: { mintAddress: ticketMint }
                });

                if (ticket && ticket.status !== "CHECKED_IN") {
                  await prisma.ticket.update({
                    where: { mintAddress: ticketMint },
                    data: { status: "CHECKED_IN" }
                  });
                  await prisma.ticketAuditLog.create({
                    data: {
                      ticketMint: ticketMint,
                      previousStatus: ticket.status,
                      newStatus: "CHECKED_IN",
                      changedAtSlot: tx.slot || 0,
                      txSignature: tx.signature || "checkin_webhook",
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.error("Error decodificando instrucción de EVENT_REGISTRY:", e);
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
