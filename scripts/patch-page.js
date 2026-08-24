const fs = require('fs');

const code = `'use client';

import dynamic from 'next/dynamic';
const EventDetails = dynamic(() => import("@/features/public/EventDetails"), { ssr: false });
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getEventById, getOrganizerEventStats } from "@/app/actions/events";
import { getEventTickets } from "@/app/actions/tickets";
import { useWalletSession } from "@solana/react-hooks";
import { CreatedEvent } from "@/features/organizer/CreateEvent";

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [mounted, setMounted] = useState(false);
  
  const [eventData, setEventData] = useState<CreatedEvent | null>(null);
  const [stats, setStats] = useState({ sold: 0, checked: 0 });
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const session = useWalletSession();
  const walletAddress = session?.account?.address?.toString();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadEvent() {
      if (!params?.id) return;
      try {
        setLoading(true);
        const eventId = String(params.id);
        const [evData, allStats, eventTickets] = await Promise.all([
          getEventById(eventId),
          walletAddress ? getOrganizerEventStats(walletAddress) : Promise.resolve({}),
          getEventTickets(Number(eventId))
        ]);

        if (evData) {
          const formattedEvent: CreatedEvent = {
            id: evData.id,
            name: evData.title,
            category: evData.category || "Otro",
            date: evData.startDate ? new Date(evData.startDate).toISOString().split('T')[0] : "",
            time: evData.startDate ? new Date(evData.startDate).toTimeString().split(' ')[0].substring(0, 5) : "",
            venue: evData.location || "",
            price: evData.ticketPriceSol,
            aforo: evData.capacity,
            collectionMint: evData.collectionMint || "",
            coverImage: evData.coverImageUrl || undefined,
            organizerWallet: evData.organizerPubkey,
            description: evData.description || "",
            zones: typeof evData.zones === 'string' ? JSON.parse(evData.zones) : (evData.zones as any[] || []),
            allowResale: false,
            isSoulbound: true,
            createdAt: new Date(evData.lastUpdatedAt).getTime()
          };
          setEventData(formattedEvent);
        }
        
        if (allStats[eventId]) {
          setStats(allStats[eventId]);
        }
        
        if (eventTickets) {
          setTickets(eventTickets);
        }

      } catch (err) {
        console.error("Error loading event details:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (mounted) {
      loadEvent();
    }
  }, [mounted, params?.id, walletAddress]);

  if (!mounted || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F7F8F7' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #D3D1C7', borderTopColor: '#14F195', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!eventData) return <div style={{ padding: '40px', textAlign: 'center' }}>Evento no encontrado</div>;

  return (
    <EventDetails 
      event={eventData} 
      stats={stats} 
      ownedTickets={tickets.map(t => ({ mint: t.mintAddress, purchaseDate: new Date(t.createdAt).getTime(), eventId: t.eventAddress }))}
      onBack={() => router.push('/dashboard')} 
      onGoToStaff={() => router.push(\`/event/\${eventData.id}/staff-manager\`)} 
    />
  );
}
`;

fs.writeFileSync('src/app/(public)/event/[id]/page.tsx', code);
