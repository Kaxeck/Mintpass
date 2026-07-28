'use client';

import dynamic from 'next/dynamic';
const StaffPanel = dynamic(() => import("@/features/organizer/StaffPanel"), { ssr: false });
import { useMintpassStore } from "@/store";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function StaffPanelPage() {
  const { createdEvents, eventStats, updateStats, isHydrated } = useMintpassStore();
  const router = useRouter();
  const params = useParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  const eventId = Number(params?.id);
  const ev = createdEvents.find(e => e.id === eventId) || createdEvents[0];

  return (
    <StaffPanel 
      event={ev} 
      stats={eventStats[ev?.id]} 
      onCheckIn={() => { if(ev) updateStats(ev.id, 'checked', 1); }} 
      onBack={() => router.push(`/event/${eventId}`)} 
    />
  );
}
