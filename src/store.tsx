'use client';

import { createContext, useContext, useState, useEffect, PropsWithChildren } from "react";
import { CreatedEvent } from "./views/CreateEvent";

const LS_EVENTS_KEY = "mintpass_created_events";
const LS_COLLECTION_KEY = "mintpass_last_collection";

interface OwnedTicket {
  eventId: number;
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
  eventStats: Record<number, EventStats>;
  updateStats: (id: number, type: 'sold' | 'checked', amount: number) => void;
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
  const [collectionMint, setCollectionMint] = useState<string>('');
  const [ownedTickets, setOwnedTickets] = useState<OwnedTicket[]>([]);
  const [eventStats, setEventStats] = useState<Record<number, EventStats>>({});

  useEffect(() => {
    // Hydrate state from localStorage on client mount
    try {
      const savedEvents = localStorage.getItem(LS_EVENTS_KEY);
      if (savedEvents) setCreatedEvents(JSON.parse(savedEvents));

      const savedCol = localStorage.getItem(LS_COLLECTION_KEY);
      if (savedCol) setCollectionMint(savedCol);

      const savedTickets = localStorage.getItem("mintpass_owned_tickets");
      if (savedTickets) setOwnedTickets(JSON.parse(savedTickets));

      const savedStats = localStorage.getItem("mintpass_event_stats");
      if (savedStats) setEventStats(JSON.parse(savedStats));
    } catch (e) {
      console.error("Error hydrating state from localStorage", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(createdEvents));
  }, [createdEvents, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(LS_COLLECTION_KEY, collectionMint);
  }, [collectionMint, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("mintpass_owned_tickets", JSON.stringify(ownedTickets));
  }, [ownedTickets, isHydrated]);

  const updateStats = (id: number, type: 'sold' | 'checked', amount: number) => {
    setEventStats(prev => {
      const current = prev[id] || { sold: 0, checked: 0 };
      const next = { ...prev, [id]: { ...current, [type]: current[type] + amount } };
      localStorage.setItem("mintpass_event_stats", JSON.stringify(next));
      return next;
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
        isHydrated
      }}
    >
      {children}
    </MintpassContext.Provider>
  );
}
