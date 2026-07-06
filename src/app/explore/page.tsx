'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const EventView = dynamic(() => import("@/views/EventView"), { ssr: false });

export default function ExplorePage() {
  const router = useRouter();

  return (
    <EventView onBack={() => router.push('/')} />
  );
}
