'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const EventView = dynamic(() => import("@/features/public/EventView"), { ssr: false });

export default function ClientExplorePage({ events }: { events: any[] }) {
  const router = useRouter();

  return (
    <EventView 
      events={events}
      onBack={() => router.back()} 
      onGoToMyTickets={() => router.push('/tickets')}
      onEventClick={(id: string | number) => router.push(`/purchase/${id}`)}
    />
  );
}
