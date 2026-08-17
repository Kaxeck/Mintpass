'use client';

import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";

const Home = dynamic(() => import("@/features/public/Home"), { ssr: false });

export default function ClientHomePage({ events }: { events: any[] }) {
  const router = useRouter();

  return (
    <Home
      createdEvents={events}
      onGoToMyTickets={() => router.push('/tickets')}
      onGoToExplore={() => router.push('/explore')}
      onEventClick={(id: string | number) => {
        router.push(`/purchase/${id}`);
      }}
    />
  );
}
