'use client';

import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useActiveSolanaWallet } from "@/hooks/useActiveSolanaWallet";
import { getEventsByOrganizer, getOrganizerEventStats } from "@/app/actions/events";
import { getOrganizerProfile } from "@/app/actions/organizer";
import { type OrganizerProfile } from "@/features/organizer/OrganizerProfileSetup";
import { type CreatedEvent } from "@/features/organizer/CreateEvent";

import OrganizerProfileSetup from "@/features/organizer/OrganizerProfileSetup";

const OrganizerDashboard = dynamic(() => import("@/features/organizer/OrganizerDashboard"), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [createdEvents, setCreatedEvents] = useState<CreatedEvent[]>([]);
  const [eventStats, setEventStats] = useState<Record<string, { sold: number; checked: number }>>({});
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { walletAddress, ready, getAccessToken } = useActiveSolanaWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!ready) return; // Wait for Privy to initialize
      
      if (!walletAddress) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const token = await getAccessToken() || undefined;
        const [events, profile, stats] = await Promise.all([
          getEventsByOrganizer(walletAddress, token),
          getOrganizerProfile(walletAddress, token),
          getOrganizerEventStats(walletAddress, token)
        ]);
        
        const formattedEvents = events.map((ev: any) => ({
          id: ev.id,
          address: ev.address || undefined,
          escrowVault: ev.escrowVault || undefined,
          status: ev.status,
          name: ev.title,
          category: ev.category || "Otro",
          date: ev.startDate ? new Date(ev.startDate).toISOString().split('T')[0] : "",
          time: ev.startDate ? new Date(ev.startDate).toISOString().split('T')[1].substring(0, 5) : "",
          venue: ev.location || "",
          price: ev.ticketPriceSol,
          hasMultipleZones: Array.isArray(ev.zones) ? ev.zones.length > 1 : false,
          aforo: ev.capacity,
          collectionMint: ev.collectionMint || "",
          coverImage: ev.coverImageUrl || undefined,
          organizerWallet: ev.organizerPubkey,
          description: ev.description || "",
          zones: typeof ev.zones === 'string' ? JSON.parse(ev.zones) : (ev.zones as any[] || []),
          allowResale: ev.allowResale || false,
          isSoulbound: ev.isSoulbound !== undefined ? ev.isSoulbound : true,
          createdAt: new Date(ev.lastUpdatedAt).getTime()
        }));

        setCreatedEvents(formattedEvents);
        setEventStats(stats);
        
        if (profile) {
          setOrganizerProfile({
            name: profile.companyName || "",
            category: profile.organizerCategory || "",
            bio: profile.bio || "",
            supportEmail: profile.contactEmail || "",
            internalPhone: profile.contactPhone || "",
            logoUrl: profile.logoUrl || ""
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (mounted && ready) {
      fetchData();
    }
  }, [mounted, ready, walletAddress]);

  if (!mounted || !ready || loading) return null;

  return (
    <OrganizerDashboard 
      createdEvents={createdEvents}
      eventStats={eventStats}
      organizerProfile={organizerProfile}
      onProfileComplete={setOrganizerProfile}
      onEventCreated={(ev) => setCreatedEvents(prev => [ev, ...prev])}
      onBack={() => router.push('/')} 
      onCreate={() => router.push('/create')} 
      onEventClick={(id) => { /* Dashboard now handles selectedEventId internally */ }} 
      onGoToMyTickets={() => router.push('/tickets')}
      onGoToExplore={() => router.push('/explore')}
    />
  );
}
