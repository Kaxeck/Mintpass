import { Resend } from 'resend';

// Solo instanciamos si tenemos API KEY válida (ignora el placeholder)
const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith("re_") && !process.env.RESEND_API_KEY.includes("placeholder")
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Reemplazar por el dominio verificado en Resend en producción (e.g. hello@mintpass.com)
const SENDER_EMAIL = 'onboarding@resend.dev';

export async function sendEventPublishedEmail(organizerEmail: string, eventTitle: string) {
  if (!resend) {
    console.warn("Resend API Key is missing or placeholder. Skipping email for event:", eventTitle);
    return;
  }
  
  try {
    await resend.emails.send({
      from: `Mintpass <${SENDER_EMAIL}>`,
      to: [organizerEmail],
      subject: `¡Tu evento "${eventTitle}" ya está en vivo! 🚀`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6d28d9;">¡Enhorabuena!</h2>
          <p>Tu evento <strong>${eventTitle}</strong> ha sido exitosamente minteado en Solana y ya está público.</p>
          <p>Tus asistentes ya pueden empezar a comprar boletos con la máxima seguridad anti-reventa.</p>
          <br/>
          <a href="https://mintpass.com/dashboard" style="background-color: #6d28d9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ir a mi Dashboard</a>
        </div>
      `,
    });
    console.log(`Email sent to organizer: ${organizerEmail}`);
  } catch (error) {
    console.error("Failed to send event published email:", error);
  }
}

export async function sendTicketPurchasedEmail(buyerEmail: string, eventTitle: string, ticketMintUrl: string) {
  if (!resend) {
    console.warn("Resend API Key is missing. Skipping ticket email for:", buyerEmail);
    return;
  }

  try {
    await resend.emails.send({
      from: `Mintpass Tickets <${SENDER_EMAIL}>`,
      to: [buyerEmail],
      subject: `Tu boleto para ${eventTitle} 🎟️`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6d28d9;">¡Compra confirmada!</h2>
          <p>Tu boleto para <strong>${eventTitle}</strong> ha sido asegurado en la blockchain.</p>
          <p>Recuerda que tu boleto utiliza un código QR dinámico que cambiará constantemente. No tomes capturas de pantalla, ya que no serán válidas para entrar.</p>
          <br/>
          <a href="${ticketMintUrl}" style="background-color: #6d28d9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver mi Boleto</a>
        </div>
      `,
    });
    console.log(`Email sent to buyer: ${buyerEmail}`);
  } catch (error) {
    console.error("Failed to send ticket purchased email:", error);
  }
}
