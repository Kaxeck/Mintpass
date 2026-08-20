'use client';

import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";

const OrganizerLanding = dynamic(() => import("@/features/public/OrganizerLanding"), { ssr: false });

export default function OrganizersPage() {
  const router = useRouter();

  return (
    <OrganizerLanding 
      onGoToExplore={() => router.push('/explore')}
      onGoToMyTickets={() => router.push('/tickets')}
    />
  );
}
