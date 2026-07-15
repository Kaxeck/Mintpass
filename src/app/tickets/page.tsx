'use client';

import dynamic from 'next/dynamic';
const TicketsList = dynamic(() => import("@/features/buyer/TicketsList"), { ssr: false });
import { useMintpassStore } from "@/store";
import { EVENTS } from "@/data/events";
import { useWalletSession } from "@solana/react-hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TicketsListPage() {
  const { createdEvents, ownedTickets, isHydrated } = useMintpassStore();
  const router = useRouter();
  const session = useWalletSession();
  const { user } = usePrivy();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  const currentWalletPk = user?.wallet?.address || session?.account?.address?.toString() || "unconnected";
  const allEvents = [...EVENTS, ...createdEvents];
  const myTickets = ownedTickets.filter(t => t.owner === currentWalletPk);

  return (
    <TicketsList 
       tickets={myTickets} 
       allEvents={allEvents} 
       onBack={() => router.push('/')} 
       onTicketClick={(mint) => {
          if (mint === 'mock1' || mint === 'mock2') {
            router.push(`/ticket/${mint}`);
            return;
          }
          const t = ownedTickets.find(x => x.mint === mint);
          if (t) {
            router.push(`/ticket/${mint}?eventId=${t.eventId}`);
          }
       }} 
    />
  );
}
