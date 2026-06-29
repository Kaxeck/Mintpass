'use client';

import dynamic from 'next/dynamic';
const TicketsList = dynamic(() => import("@/views/TicketsList"), { ssr: false });
import { useMintpassStore } from "@/store";
import { EVENTS } from "@/data/events";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TicketsListPage() {
  const { createdEvents, ownedTickets, isHydrated } = useMintpassStore();
  const router = useRouter();
  const wallet = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  const currentWalletPk = wallet?.publicKey?.toBase58() || "unconnected";
  const allEvents = [...EVENTS, ...createdEvents];
  const myTickets = ownedTickets.filter(t => t.owner === currentWalletPk);

  return (
    <TicketsList 
       tickets={myTickets} 
       allEvents={allEvents} 
       onBack={() => router.push('/')} 
       onTicketClick={(mint) => {
          const t = ownedTickets.find(x => x.mint === mint);
          if (t) {
            router.push(`/ticket/${mint}?eventId=${t.eventId}`);
          }
       }} 
    />
  );
}
