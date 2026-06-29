'use client';

import dynamic from 'next/dynamic';
const EventDetails = dynamic(() => import("@/views/EventDetails"), { ssr: false });
import { useMintpassStore } from "@/store";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EventDetailsPage() {
  const { createdEvents, eventStats, ownedTickets, isHydrated } = useMintpassStore();
  const router = useRouter();
  const params = useParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  const eventId = Number(params?.id);
  const ev = createdEvents.find(e => e.id === eventId) || createdEvents[0];
  
  if (!ev) return null;

  return (
    <EventDetails 
      event={ev} 
      stats={eventStats[ev.id]} 
      ownedTickets={ownedTickets.filter(t => t.eventId === ev.id)}
      onBack={() => router.push('/dashboard')} 
      onGoToStaff={() => router.push(`/event/${ev.id}/staff`)} 
    />
  );
}
