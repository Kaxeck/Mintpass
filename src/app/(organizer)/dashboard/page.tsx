'use client';

import dynamic from 'next/dynamic';
import { useMintpassStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import OrganizerProfileSetup from "@/features/organizer/OrganizerProfileSetup";

const OrganizerDashboard = dynamic(() => import("@/features/organizer/OrganizerDashboard"), { ssr: false });

export default function DashboardPage() {
  const { createdEvents, eventStats, isHydrated, organizerProfile, setOrganizerProfile } = useMintpassStore();
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
      organizerProfile={organizerProfile}
      onProfileComplete={setOrganizerProfile}
      onBack={() => router.push('/')} 
      onCreate={() => {}} 
      onEventClick={(id) => router.push(`/event/${id}`)} 
      onGoToMyTickets={() => router.push('/tickets')}
      onGoToExplore={() => router.push('/explore')}
    />
  );
}
