'use client';

import { createContext, useContext, useState, useEffect, PropsWithChildren } from "react";
import { CreatedEvent } from "./features/organizer/CreateEvent";

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
      let parsedEvents = savedEvents ? JSON.parse(savedEvents) : [];
      
      // Migration: detect old mock events with non-ISO dates and reset them
      const hasBrokenMocks = parsedEvents.some((ev: CreatedEvent) => 
        (ev.id === 9999 || ev.id === 8888) && ev.date && isNaN(new Date(ev.date + 'T12:00').getTime())
      );
      if (hasBrokenMocks) {
        // Remove old mock events so fresh ones get loaded below
        parsedEvents = parsedEvents.filter((ev: CreatedEvent) => ev.id !== 9999 && ev.id !== 8888);
        localStorage.removeItem(LS_EVENTS_KEY);
      }
      
      if (parsedEvents.length > 0) {
        setCreatedEvents(parsedEvents);
      } else {
        setCreatedEvents([
          {
            id: 9999,
            name: "Noche de jazz — CDMX",
            description: "Un concierto íntimo de jazz en el corazón de la CDMX.",
            date: new Date().toISOString().split('T')[0],
            time: "21:00",
            venue: "Foro Indie Rocks",
            category: "Música",
            coverImage: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&q=80&w=1200",
            zones: [
              { id: '1', name: 'General', capacity: 300, price: 350, isNumbered: false }
            ],
            allowResale: false,
            isSoulbound: true,
            allowRefunds: true,
            refundTimeLimit: 3,
            organizerWallet: "MintpassAdmin",
            createdAt: Date.now(),
            ageRestriction: "18+",
            doorTime: "19:00",
            collectionMint: "11111111111111111111111111111111"
          },
          {
            id: 8888,
            name: "Festival Sonora Norte",
            description: "El festival más grande del norte del país.",
            date: "2026-08-15",
            time: "20:00",
            venue: "Parque Metropolitano, León",
            category: "Festival",
            coverImage: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=1200",
            zones: [
              { id: '1', name: 'VIP', capacity: 100, price: 1200, isNumbered: true },
              { id: '2', name: 'General', capacity: 500, price: 500, isNumbered: false }
            ],
            allowResale: true,
            resaleCapLimit: 1200,
            isSoulbound: false,
            allowRefunds: false,
            organizerWallet: "MintpassAdmin",
            createdAt: Date.now() - 100000,
            ageRestriction: "Todas las edades",
            doorTime: "18:00",
            collectionMint: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
          }
        ]);
      }

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
