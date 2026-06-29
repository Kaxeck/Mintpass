'use client';

import dynamic from 'next/dynamic';
const BuyerPurchase = dynamic(() => import("@/views/BuyerPurchase"), { ssr: false });
import { useMintpassStore } from "@/store";
import { EVENTS } from "@/data/events";
import { EventModel } from "@/types";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BuyerPurchasePage() {
  const { createdEvents, eventStats, collectionMint, updateStats, ownedTickets, setOwnedTickets, isHydrated } = useMintpassStore();
  const router = useRouter();
  const params = useParams();
  const wallet = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  const currentWalletPk = wallet?.publicKey?.toBase58() || "unconnected";
  const selectedEventId = Number(params?.id);

  const evCreated = createdEvents.find(e => e.id === selectedEventId);
  let eventModel: EventModel;
  
  if (evCreated) {
    eventModel = {
        id: evCreated.id,
        name: evCreated.name,
        date: `${evCreated.date} · ${evCreated.time}`,
        duration: '3h',
        venue: evCreated.venue,
        price: evCreated.priceType === 'free' ? 0 : evCreated.price,
        total: evCreated.aforo,
        limitPerWallet: evCreated.limitPerWallet,
        sold: eventStats[evCreated.id]?.sold || 0,
        cat: evCreated.category,
        icon: 'Ticket',
        bg: '#534AB7', color: '#fff'
    };
  } else {
    const evDummy = EVENTS.find(e => e.id === selectedEventId) || EVENTS[0];
    eventModel = { ...evDummy, sold: eventStats[evDummy.id]?.sold || evDummy.sold };
  }

  return (
    <BuyerPurchase 
      event={eventModel} 
      collectionMint={evCreated ? evCreated.collectionMint : collectionMint}
      ownedTicketsCount={ownedTickets.filter(t => t.eventId === eventModel.id && t.owner === currentWalletPk).length}
      onSuccessMint={(mintInfos, qty) => {
          updateStats(eventModel.id, 'sold', qty);
          
          const mintsArray = Array.isArray(mintInfos) ? mintInfos : [mintInfos];
          
          setOwnedTickets(prev => {
            const next = [...prev];
            mintsArray.forEach(mintInfo => {
                next.push({ eventId: eventModel.id, mint: mintInfo, purchaseDate: Date.now(), owner: currentWalletPk });
            });
            return next;
          });

          // Navigate to the first ticket minted
          if (mintsArray.length > 0) {
            router.push(`/ticket/${mintsArray[0]}?eventId=${eventModel.id}`);
          } else {
            router.push('/tickets');
          }
      }}
      onBack={() => router.push('/')} 
      onGoToMyTicket={() => router.push('/tickets')} 
    />
  );
}
