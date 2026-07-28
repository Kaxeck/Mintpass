'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const EventView = dynamic(() => import("@/features/public/EventView"), { ssr: false });

export default function ExplorePage() {
  const router = useRouter();

  return (
    <EventView 
      onBack={() => router.back()} 
      onGoToMyTickets={() => router.push('/tickets')}
      onEventClick={(id: number) => router.push(`/purchase/${id}`)}
    />
  );
}
