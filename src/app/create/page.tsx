'use client';

import dynamic from 'next/dynamic';
const CreateEvent = dynamic(() => import("@/views/CreateEvent"), { ssr: false });
import { useMintpassStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CreateEventPage() {
  const { setCreatedEvents, setCollectionMint, isHydrated } = useMintpassStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) return null;

  return (
    <CreateEvent 
      onBack={() => router.push('/dashboard')} 
      onSuccess={(newEvent) => {
        setCreatedEvents(prev => [...prev, newEvent]);
        setCollectionMint(newEvent.collectionMint);
        router.push('/dashboard');
      }} 
    />
  );
}
