'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMintpassStore } from "@/store";

const StaffPanel = dynamic(() => import('@/features/organizer/StaffPanel'), { ssr: false });

export default function StaffScannerPage() {
  const params = useParams();
  const token = params?.token as string;
  const { createdEvents, eventStats, updateStats, isHydrated } = useMintpassStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  // In a real app, the backend would validate the token and return the event ID.
  // For the mock, we just assume the first event or the latest event.
  const ev = createdEvents.length > 0 ? createdEvents[0] : undefined;

  return (
    <StaffPanel 
      event={ev} 
      stats={ev ? eventStats[ev.id] : { sold: 0, checked: 0 }} 
      onCheckIn={() => { if(ev) updateStats(ev.id, 'checked', 1); }} 
      onBack={() => {}} // No back button since this is an isolated PWA view
    />
  );
}
