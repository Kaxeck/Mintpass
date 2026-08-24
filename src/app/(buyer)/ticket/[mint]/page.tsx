'use client';

import dynamic from 'next/dynamic';
const MyTicket = dynamic(() => import("@/features/buyer/MyTicket"), { ssr: false });
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getTicketWithEvent } from "@/app/actions/tickets";
import { useActiveSolanaWallet } from "@/hooks/useActiveSolanaWallet";

export default function MyTicketPage() {
  const router = useRouter();
  const { walletAddress, ready, getAccessToken } = useActiveSolanaWallet();
  const params = useParams();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [eventModel, setEventModel] = useState<any>(null);
  const [qrSecret, setQrSecret] = useState<string>("fallback_secret");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ticketMint = params?.mint as string;
  const selectedEventId = searchParams?.get("eventId") as string;
  
  useEffect(() => {
    async function fetchEventAndTicket() {
      if (!ticketMint || !walletAddress) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const token = await getAccessToken() || undefined;
        const ticketWithEvent = await getTicketWithEvent(ticketMint, walletAddress, token);
        if (ticketWithEvent && ticketWithEvent.event) {
          const ev = ticketWithEvent.event;
          setEventModel({
            id: ev.id,
            name: ev.title,
            date: ev.startDate ? new Date(ev.startDate).toISOString().split('T')[0] : "",
            time: ev.startDate ? new Date(ev.startDate).toISOString().split('T')[1].substring(0, 5) : "",
            venue: ev.location || "",
            price: ev.ticketPriceSol,
            aforo: ev.capacity,
            collectionMint: ev.collectionMint || "",
            coverImage: ev.coverImageUrl || undefined,
            ticketImage: ev.ticketImageUrl || undefined,
            organizerWallet: ev.organizerPubkey,
            description: ev.description || "",
            zones: typeof ev.zones === 'string' ? JSON.parse(ev.zones) : (ev.zones as any[] || []),
            organizerName: (ev as any).userProfile?.companyName || (ev as any).userProfile?.name || "Organizador Independiente",
            organizerReputation: (ev as any).userProfile?.reputation?.score || 100,
            organizerEvents: (ev as any).userProfile?.reputation?.successfulEvents || 1,
            buyerWallet: (ticketWithEvent as any).ownerPubkey,
            ticketZoneIndex: ticketWithEvent.zoneIndex,
            ticketRow: ticketWithEvent.row,
            ticketSeat: ticketWithEvent.seat,
            ticketNumber: (ticketWithEvent as any).ticketNumber,
            ticketStatus: ticketWithEvent.status,
            allowResale: false,
            isSoulbound: true,
            createdAt: new Date(ev.lastUpdatedAt).getTime()
          });
          setQrSecret(ticketWithEvent.qrSecret || "fallback_secret");
        }
      } catch (e) {
        console.error("Error fetching event for ticket view:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchEventAndTicket();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchEventAndTicket();
    }, 10000);

    return () => clearInterval(interval);
  }, [ticketMint, walletAddress]);

  if (!mounted || !ready || loading) return null;

  if (!eventModel) {
    return <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Boleto no encontrado</h2>
      <button onClick={() => router.push('/tickets')}>Volver a Mis Boletos</button>
    </div>;
  }

  if (eventModel.buyerWallet && walletAddress !== eventModel.buyerWallet) {
    return <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Acceso Denegado</h2>
      <p style={{ color: '#666', marginBottom: '24px', maxWidth: '400px' }}>Este boleto pertenece a otra cuenta de Solana. Por favor, conecta la cartera correcta para ver este boleto.</p>
      <button 
        style={{ padding: '12px 24px', background: '#1E1E1E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        onClick={() => router.push('/tickets')}
      >
        Volver a Mis Boletos
      </button>
    </div>;
  }

  return (
    <MyTicket 
      event={eventModel} 
      ticketMint={ticketMint || (process.env.NEXT_PUBLIC_EVENT_COLLECTION_MINT as string)}
      qrSecret={qrSecret}
      onBack={() => router.push('/tickets')} 
    />
  );
}
