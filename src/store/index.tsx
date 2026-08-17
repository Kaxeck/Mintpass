'use client';

import { createContext, useContext, useState, useEffect, PropsWithChildren } from "react";
import { CreatedEvent } from "../features/organizer/CreateEvent";
import { OrganizerProfile } from "../features/organizer/OrganizerProfileSetup";

const LS_EVENTS_KEY = "mintpass_created_events";
const LS_COLLECTION_KEY = "mintpass_last_collection";

interface OwnedTicket {
  eventId: string | number;
  mint: string;
  purchaseDate: number;
  readonly?: boolean;
  owner?: string;
}

interface EventStats {
  sold: number;
  checked: number;
}

interface MintpassContextType {
  createdEvents: CreatedEvent[];
  setCreatedEvents: React.Dispatch<React.SetStateAction<CreatedEvent[]>>;
  collectionMint: string;
  setCollectionMint: React.Dispatch<React.SetStateAction<string>>;
  ownedTickets: OwnedTicket[];
  setOwnedTickets: React.Dispatch<React.SetStateAction<OwnedTicket[]>>;
  eventStats: Record<string, EventStats>;
  updateStats: (id: string | number, type: 'sold' | 'checked', amount: number) => void;
  organizerProfile: OrganizerProfile | null;
  setOrganizerProfile: React.Dispatch<React.SetStateAction<OrganizerProfile | null>>;
  isHydrated: boolean;
}

const MintpassContext = createContext<MintpassContextType | null>(null);

export function useMintpassStore() {
  const context = useContext(MintpassContext);
  if (!context) {
    throw new Error("useMintpassStore must be used within MintpassProvider");
  }
  return context;
}

export function MintpassProvider({ children }: PropsWithChildren) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [createdEvents, setCreatedEvents] = useState<CreatedEvent[]>([]);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [collectionMint, setCollectionMint] = useState<string>('');
  const [ownedTickets, setOwnedTickets] = useState<OwnedTicket[]>([]);
  const [eventStats, setEventStats] = useState<Record<string, EventStats>>({});

  useEffect(() => {
    // DB Fetching logic should ideally happen per-page or via SWR/React Query.
    // We just mark as hydrated to allow rendering of children that depend on this flag.
    setIsHydrated(true);
  }, []);

  const updateStats = (id: string | number, type: 'sold' | 'checked', amount: number) => {
    setEventStats(prev => {
      const stringId = id.toString();
      const current = prev[stringId] || { sold: 0, checked: 0 };
      return { ...prev, [stringId]: { ...current, [type]: current[type] + amount } };
    });
  };

  return (
    <MintpassContext.Provider
      value={{
        createdEvents,
        setCreatedEvents,
        collectionMint,
        setCollectionMint,
        ownedTickets,
        setOwnedTickets,
        eventStats,
        updateStats,
        organizerProfile,
        setOrganizerProfile,
        isHydrated
      }}
    >
      {children}
    </MintpassContext.Provider>
  );
}
