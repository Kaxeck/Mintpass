'use client';

import dynamic from 'next/dynamic';
const MyTicket = dynamic(() => import("@/views/MyTicket"), { ssr: false });
import { useMintpassStore } from "@/store";
import { EVENTS } from "@/data/events";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MyTicketPage() {
  const { createdEvents, isHydrated } = useMintpassStore();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  const ticketMint = params?.mint as string;
  const selectedEventId = Number(searchParams?.get("eventId") || 0);
  
  const ev = createdEvents.find(e => e.id === selectedEventId) || EVENTS.find(e => e.id === selectedEventId) || EVENTS[0];

  return (
    <MyTicket 
      event={ev} 
      ticketMint={ticketMint || (process.env.NEXT_PUBLIC_EVENT_COLLECTION_MINT as string)}
      onBack={() => router.push('/tickets')} 
    />
  );
}
