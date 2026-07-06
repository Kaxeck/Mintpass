import { NextResponse } from "next/server";
import { updateTicketStatus } from "@/lib/mock-db";

export async function POST(request: Request) {
  try {
    // 1. En el futuro, aquí recibiremos la notificación real de MercadoPago
    // const body = await request.json();
    // const topic = body.type || body.topic;
    // const paymentId = body.data.id;
    // Validar firma de MP...

    // SIMULACIÓN: Asumimos que nos mandan el ticketId en el body para propósitos de prueba
    const body = await request.json();
    
    if (!body.ticketId) {
      return NextResponse.json({ error: "Falta ticketId (Solo en modo simulación)" }, { status: 400 });
    }

    // 2. Simulamos que el pago fue exitoso y actualizamos el Ticket en la Mock DB a ACTIVE
    const ticket = await updateTicketStatus(body.ticketId, 'ACTIVE');

    if (!ticket) {
      return NextResponse.json({ error: "Ticket no encontrado en Mock DB" }, { status: 404 });
    }

    // 3. En el futuro, aquí llamaríamos a Crossmint para mintear el NFT real
    // await mintWithCrossmint(ticket.userId, ticket.eventId);

    console.log(`[Webhook] Pago simulado exitoso para ticket ${body.ticketId}. Status -> ACTIVE.`);
    return NextResponse.json({ success: true, message: "Webhook procesado y ticket activado" });
    
  } catch (error: any) {
    console.error("Error en Webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
