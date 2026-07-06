'use client';

import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";

const OrganizerLanding = dynamic(() => import("@/views/OrganizerLanding"), { ssr: false });

export default function OrganizersPage() {
  const router = useRouter();

  return (
    <OrganizerLanding 
      onGoToExplore={() => router.push('/explore')}
      onGoToMyTickets={() => router.push('/tickets')}
    />
  );
}
