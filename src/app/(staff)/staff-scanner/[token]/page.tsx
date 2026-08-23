'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getEventByStaffToken } from "@/app/actions/events";
import { checkInTicket } from "@/app/actions/tickets";
import { type EventModel } from "@/types";

const StaffPanel = dynamic(() => import('@/features/organizer/StaffPanel'), { ssr: false });

export default function StaffScannerPage() {
  const params = useParams();
  const token = params?.token as string;
  const [mounted, setMounted] = useState(false);
  const [eventModel, setEventModel] = useState<any>(null);
  const [stats, setStats] = useState({ sold: 0, checked: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchEvent() {
      if (!token) return;
      setLoading(true);
      try {
        const ev = await getEventByStaffToken(token);
        if (ev) {
          setEventModel({
            id: ev.id,
            name: ev.title,
            date: ev.startDate ? new Date(ev.startDate).toISOString().split('T')[0] : "",
            time: ev.startDate ? new Date(ev.startDate).toTimeString().split(' ')[0].substring(0, 5) : "",
            venue: ev.location || "",
            price: ev.ticketPriceSol,
            aforo: ev.capacity,
            collectionMint: ev.collectionMint || "",
            coverImage: ev.coverImageUrl || undefined,
            organizerWallet: ev.organizerPubkey,
            description: ev.description || "",
            zones: typeof ev.zones === 'string' ? JSON.parse(ev.zones) : (ev.zones as any[] || []),
            allowResale: false,
            isSoulbound: true,
            createdAt: new Date(ev.lastUpdatedAt).getTime()
          });
          
          // TODO: Get real check-in stats from DB
          setStats({ sold: 0, checked: 0 });
        }
      } catch (e) {
        console.error("Error fetching event for scanner:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [token]);

  if (!mounted || loading) return null;
  
  if (!eventModel) {
    return <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Acceso denegado</h2>
      <p>Este enlace de staff es inválido o ha expirado.</p>
    </div>;
  }

  return (
    <StaffPanel 
      event={eventModel} 
      stats={stats} 
      onCheckIn={async (payload: any) => { 
        if (eventModel && payload?.mint) {
          const res = await checkInTicket(payload.mint, token, payload.timestamp, payload.hash);
          if (res.success) {
            setStats(prev => ({ ...prev, checked: prev.checked + 1 }));
            return { success: true };
          } else {
            return { success: false, error: res.error };
          }
        }
        return { success: false, error: "QR Inválido" };
      }} 
      onBack={() => {}} // No back button since this is an isolated PWA view
    />
  );
}
