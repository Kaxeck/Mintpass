'use client';

import { Country, State } from 'country-state-city';
import dynamic from 'next/dynamic';
const BuyerPurchase = dynamic(() => import("@/features/buyer/BuyerPurchase"), { ssr: false });
import { EventModel } from "@/types";
import { useWalletSession } from "@solana/react-hooks";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getEventById } from "@/app/actions/events";
import { getUserTickets, mintTicketInDb } from "@/app/actions/tickets";

export default function BuyerPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const session = useWalletSession();
  const [mounted, setMounted] = useState(false);
  const [eventModel, setEventModel] = useState<EventModel | null>(null);
  const [collectionMint, setCollectionMint] = useState<string>('');
  const [ownedTicketsCount, setOwnedTicketsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentWalletPk = session?.account?.address?.toString() || "unconnected";
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
          const timeStr = ev.startDate ? new Date(ev.startDate).toTimeString().split(' ')[0].substring(0, 5) : "";
          
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
            limitPerWallet: 0,
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
            country: countryName || ev.countryIso || undefined
          });
          setCollectionMint(ev.collectionMint || '');
        }

        if (currentWalletPk !== "unconnected") {
          const tickets = await getUserTickets(currentWalletPk);
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
      onSuccessMint={async (mintInfos, qty) => {
          const mintsArray = Array.isArray(mintInfos) ? mintInfos : [mintInfos];
          
          // Save to DB
          for (const mintInfo of mintsArray) {
            await mintTicketInDb({
              mintAddress: mintInfo,
              eventAddress: eventModel.id,
              ownerPubkey: currentWalletPk,
              originalPrice: eventModel.price,
              pricePaid: eventModel.price
            });
          }

          if (mintsArray.length > 0) {
            router.push(`/ticket/${mintsArray[0]}?eventId=${eventModel.id}`);
          } else {
            router.push('/tickets');
          }
      }}
      onBack={() => router.back()} 
      onGoToMyTicket={() => router.push('/tickets')} 
    />
  );
}
