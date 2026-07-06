'use client';

import dynamic from 'next/dynamic';
const Home = dynamic(() => import("@/views/Home"), { ssr: false });
import { useMintpassStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { createdEvents, isHydrated } = useMintpassStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  return (
    <Home 
      createdEvents={createdEvents}
      onGoToOrganizer={() => router.push('/dashboard')} 
      onGoToMyTickets={() => router.push('/tickets')}
      onGoToExplore={() => router.push('/explore')}
      onEventClick={(id: number) => {
        router.push(`/purchase/${id}`);
      }}
    />
  );
}
