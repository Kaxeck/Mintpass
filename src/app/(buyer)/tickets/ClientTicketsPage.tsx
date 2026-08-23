'use client';

import dynamic from 'next/dynamic';
const TicketsList = dynamic(() => import("@/features/buyer/TicketsList"), { ssr: false });
import { useActiveSolanaWallet } from "@/hooks/useActiveSolanaWallet";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserTickets } from "@/app/actions/tickets";

export default function TicketsListPage() {
  const router = useRouter();
  const { walletAddress } = useActiveSolanaWallet();
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadTickets() {
      if (!walletAddress) {
        setLoading(false);
        return;
      }
      
      try {
        const dbTickets = await getUserTickets(walletAddress);
        setTickets(dbTickets);
      } catch (e) {
        console.error("Error fetching tickets", e);
      } finally {
        setLoading(false);
      }
    }
    
    if (mounted) {
      loadTickets();
    }
  }, [mounted, walletAddress]);

  if (!mounted) return null;

  return (
    <TicketsList 
       tickets={tickets} 
       loading={loading}
       onBack={() => router.push('/')} 
       onTicketClick={(mint) => {
          router.push(`/ticket/${mint}`);
       }} 
    />
  );
}
