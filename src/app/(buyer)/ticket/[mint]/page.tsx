'use client';

import dynamic from 'next/dynamic';
const MyTicket = dynamic(() => import("@/features/buyer/MyTicket"), { ssr: false });
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getTicketWithEvent } from "@/app/actions/tickets";

export default function MyTicketPage() {
  const router = useRouter();
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
      if (!ticketMint) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const ticketWithEvent = await getTicketWithEvent(ticketMint);
        if (ticketWithEvent && ticketWithEvent.event) {
          const ev = ticketWithEvent.event;
          setEventModel({
            id: ev.id,
            name: ev.title,
            date: ev.startDate ? new Date(ev.startDate).toISOString().split('T')[0] : "",
            time: ev.startDate ? new Date(ev.startDate).toTimeString().split(' ')[0].substring(0, 5) : "",
            venue: ev.location || "",
            price: ev.ticketPriceSol,
            aforo: ev.capacity,
            collectionMint: ev.collectionMint || "",
            coverImage: ev.coverImageUrl || undefined,
            organizerWallet: ev.organizerPubkey,
            description: ev.description || "",
            zones: typeof ev.zones === 'string' ? JSON.parse(ev.zones) : (ev.zones as any[] || []),
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
  }, [ticketMint]);

  if (!mounted || loading) return null;

  if (!eventModel) {
    return <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Boleto no encontrado</h2>
      <button onClick={() => router.push('/tickets')}>Volver a Mis Boletos</button>
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
