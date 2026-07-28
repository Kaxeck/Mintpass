'use client';
import dynamic from 'next/dynamic';
const CheckInStaff = dynamic(() => import("@/features/organizer/CheckInStaff"), { ssr: false });
import { useMintpassStore } from "@/store";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function StaffManagerPage() {
  const { createdEvents, isHydrated } = useMintpassStore();
  const router = useRouter();
  const params = useParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  const eventId = Number(params?.id);
  const ev = createdEvents.find(e => e.id === eventId) || createdEvents[0];
  
  if (!ev) return null;

  return (
    <div style={{ background: '#F7F8F7', minHeight: '100vh' }}>
      <div style={{ background: '#0a0a0f', padding: '0 16px' }}>
        <div className="navbar" style={{ justifyContent: 'flex-start', gap: '10px' }}>
          <div className="nav-back" onClick={() => router.push(`/event/${eventId}`)} style={{ cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </div>
          <span className="nav-title" style={{ color: '#FFF' }}>Volver al evento</span>
        </div>
      </div>
      <CheckInStaff 
        events={[ev]} 
        onGoToScanner={(token) => router.push(`/staff-scanner/${token}`)} 
      />
    </div>
  );
}
