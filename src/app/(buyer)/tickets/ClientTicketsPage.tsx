'use client';

import dynamic from 'next/dynamic';
const TicketsList = dynamic(() => import("@/features/buyer/TicketsList"), { ssr: false });
import { useActiveSolanaWallet } from "@/hooks/useActiveSolanaWallet";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { fetchUserTickets, fetchEventRecord } from "@/lib/anchor";

export default function TicketsListPage() {
  const router = useRouter();
  const { walletAddress } = useActiveSolanaWallet();
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [events, setEvents] = useState<any>({});
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
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com");
        const pubkey = new PublicKey(walletAddress);
        const receipts = await fetchUserTickets(connection, pubkey);
        
        const eventsMap: Record<string, any> = {};
        for (const receipt of receipts) {
           const eventKey = receipt.account.eventRecord.toString();
           if (!eventsMap[eventKey]) {
              const eventData = await fetchEventRecord(connection, receipt.account.eventRecord);
              eventsMap[eventKey] = eventData;
           }
        }
        
        setTickets(receipts.map((r: any) => ({
           mint: r.account.ticketMint.toString(),
           eventKey: r.account.eventRecord.toString(),
           status: r.account.status,
           zoneIndex: r.account.zoneIndex,
        })));
        setEvents(eventsMap);
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
       events={events}
       loading={loading}
       onBack={() => router.push('/')} 
       onTicketClick={(mint) => {
          router.push(`/ticket/${mint}`);
       }} 
    />
  );
}
