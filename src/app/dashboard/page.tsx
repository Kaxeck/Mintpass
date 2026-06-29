'use client';

import dynamic from 'next/dynamic';
const OrganizerDashboard = dynamic(() => import("@/views/OrganizerDashboard"), { ssr: false });
import { useMintpassStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { createdEvents, eventStats, isHydrated } = useMintpassStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  return (
    <OrganizerDashboard 
      createdEvents={createdEvents}
      eventStats={eventStats}
      onBack={() => router.push('/')} 
      onCreate={() => router.push('/create')} 
      onEventClick={(id) => router.push(`/event/${id}`)} 
    />
  );
}
