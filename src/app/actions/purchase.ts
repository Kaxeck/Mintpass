'use server';

import { createTicket } from '@/lib/mock-db';
import { privy } from '@/lib/privy';
import { cookies } from 'next/headers';
import crypto from 'crypto';

interface PurchaseParams {
  eventId: number;
  method: 'FIAT' | 'CRYPTO';
  walletAddress?: string;
}

export async function createPurchaseIntent(params: PurchaseParams) {
  try {
    // 1. Verify Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('privy-token')?.value;
    
    let userId = "anonymous"; // Fallback for local testing if no Privy login yet

    if (token) {
      try {
        const verifiedClaims = await privy.utils().auth().verifyAuthToken(token);
        userId = verifiedClaims.user_id;
      } catch (error) {
        console.warn("Invalid privy token, falling back to anonymous for testing");
      }
    }

    // Si pasaron walletAddress (e.g. Phantom connect), la usamos como userId para la DB temporal
    if (params.walletAddress) {
      userId = params.walletAddress;
    }

    // 2. Generate TOTP Secret (simulado)
    const totpSecret = crypto.randomBytes(20).toString('hex');

    // 3. Create Ticket in Mock DB as PENDING
    const ticket = await createTicket({
      eventId: params.eventId,
      userId,
      status: 'PENDING',
      purchaseMethod: params.method,
      totpSecret
    });

    // 4. Handle Fiat vs Crypto
    if (params.method === 'FIAT') {
      // Simulación de MercadoPago: En el futuro esto llamará a mercadopago.preferences.create()
      // Retornamos un link falso de checkout para probar el flujo.
      const fakeCheckoutUrl = `/simulated-checkout?ticketId=${ticket.id}`;
      return { success: true, url: fakeCheckoutUrl, ticketId: ticket.id };
    } else {
      // Para Crypto, le decimos al cliente que está listo para firmar.
      // (La transaccion UMI real se construirá en otro action o en el cliente).
      return { success: true, ticketId: ticket.id, message: "Ticket created, ready for on-chain TX" };
    }

  } catch (error: any) {
    console.error("Error creating purchase intent:", error);
    return { success: false, error: error.message || "Failed to create purchase intent" };
  }
}
