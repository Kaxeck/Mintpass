'use client';

import "@/styles/buyer.css";
import "@/features/buyer/BuyerPurchase.css";
import { Country, State } from 'country-state-city';
import dynamic from 'next/dynamic';
const BuyerPurchase = dynamic(() => import("@/features/buyer/BuyerPurchase"), { ssr: false });
import { EventModel } from "@/types";
import { useActiveSolanaWallet } from "@/hooks/useActiveSolanaWallet";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getEventById } from "@/app/actions/events";
import { getUserTickets, mintTicketInDb, deleteTicketFromDb } from "@/app/actions/tickets";

export default function BuyerPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const { walletAddress, ready, getAccessToken } = useActiveSolanaWallet();
  const [mounted, setMounted] = useState(false);
  const [eventModel, setEventModel] = useState<EventModel | null>(null);
  const [collectionMint, setCollectionMint] = useState<string>('');
  const [ownedTicketsCount, setOwnedTicketsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentWalletPk = walletAddress || "unconnected";
  const selectedEventId = params?.id as string;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchEventData() {
      if (!selectedEventId) return;
      setLoading(true);
      try {
        const ev = await getEventById(selectedEventId);
        if (ev) {
          const dateStr = ev.startDate ? new Date(ev.startDate).toISOString().split('T')[0] : "";
          const timeStr = ev.startDate ? new Date(ev.startDate).toISOString().split('T')[1].substring(0, 5) : "";
          
          const countryName = ev.countryIso ? Country.getCountryByCode(ev.countryIso)?.name : undefined;
          const stateName = (ev.countryIso && ev.stateIso) ? State.getStateByCodeAndCountry(ev.stateIso, ev.countryIso)?.name : undefined;

          setEventModel({
            id: ev.id,
            name: ev.title,
            date: `${dateStr} · ${timeStr}`,
            duration: '3h',
            venue: ev.location || "",
            price: ev.ticketPriceSol,
            total: ev.capacity,
            limitPerWallet: ev.identityLimit || 0,
            sold: (ev as any).tickets ? (ev as any).tickets.length : 0,
            cat: ev.category || "Otro",
            icon: ev.iconName || 'Ticket',
            bg: ev.themeColor || '#534AB7', color: '#fff',
            zones: Array.isArray(ev.zones) ? ev.zones as {name: string; price: number; capacity: number;}[] : [],
            organizerWallet: ev.organizerPubkey,
            doorTime: ev.doorTime || undefined,
            ageRestriction: ev.ageRestriction || undefined,
            companyName: (ev as any).userProfile?.companyName || undefined,
            contactEmail: (ev as any).userProfile?.contactEmail || undefined,
            description: ev.description || undefined,
            coverImage: ev.coverImageUrl || undefined,
            ticketImage: ev.ticketImageUrl || undefined,
            gallery: ev.galleryUrls || [],
            city: ev.cityName || undefined,
            state: stateName || ev.stateIso || undefined,
            country: countryName || ev.countryIso || undefined,
            status: ev.status,
            isEventPast: ev.startDate ? new Date(ev.startDate).getTime() < (Date.now() - new Date().getTimezoneOffset() * 60000) : false,
            allowResale: (ev as any).allowResale || false,
            resaleCapLimit: (ev as any).resaleCapLimit || null,
            allowRefunds: (ev as any).allowRefunds || false,
            refundTimeLimit: (ev as any).refundTimeLimit || null
          });
          setCollectionMint(ev.collectionMint || '');
        }

        if (currentWalletPk !== "unconnected") {
          const token = await getAccessToken() || undefined;
          const tickets = await getUserTickets(currentWalletPk, token);
          const eventTickets = tickets.filter((t: any) => t.eventAddress === ev?.address || t.eventAddress === ev?.id);
          setOwnedTicketsCount(eventTickets.length);
        }
      } catch (e) {
        console.error("Error fetching event:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchEventData();
  }, [selectedEventId, currentWalletPk]);

  if (!mounted || loading) return null;
  if (!eventModel) return <div>Evento no encontrado</div>;

  return (
    <BuyerPurchase 
      event={eventModel} 
      collectionMint={collectionMint}
      ownedTicketsCount={ownedTicketsCount}
      onBeforeMint={async (mintInfos, eventPda) => {
          const mintsArray = Array.isArray(mintInfos) ? mintInfos : [mintInfos];
          
          // Save to DB before signing
          for (const mintInfo of mintsArray) {
            await mintTicketInDb({
              mintAddress: mintInfo,
              eventAddress: eventPda, // <--- Usamos el PDA de Solana, que es lo que espera la BD
              ownerPubkey: currentWalletPk,
              originalPrice: eventModel.price,
              pricePaid: eventModel.price
            });
          }
      }}
      onCancelMint={async (mintsArray: string[]) => {
          for (const mintInfo of mintsArray) {
            await deleteTicketFromDb(mintInfo);
          }
      }}
      onSuccessMint={async (mintInfos, qty) => {
          // Ya no guardamos en DB aquí, eso lo hace onBeforeMint.
          // Y Helius webhook actualizará el estado a VALID.
      }}
      onBack={() => router.back()} 
      onGoToMyTicket={(mint) => {
        if (mint) {
          router.push(`/ticket/${mint}?eventId=${eventModel.id}`);
        } else {
          router.push('/tickets');
        }
      }} 
    />
  );
}
