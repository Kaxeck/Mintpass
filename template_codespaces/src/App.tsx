import { useState, useEffect } from "react";
import CreateEvent, { CreatedEvent } from "./pages/CreateEvent";
import EventDetails from "./pages/EventDetails";
import StaffPanel from "./pages/StaffPanel";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import Home from "./pages/Home";
import TicketsList from "./pages/TicketsList";
import BuyerPurchase from "./pages/BuyerPurchase";
import MyTicket from "./pages/MyTicket";
import { EVENTS } from "./data/events";
import { EventModel } from "./types";
import { useWallet } from "@solana/wallet-adapter-react";
import "./index.css";

// Claves de localStorage para persistir eventos entre sesiones
const LS_EVENTS_KEY = "mintpass_created_events";
const LS_COLLECTION_KEY = "mintpass_last_collection";

export default function App() {
  const wallet = useWallet();
  const currentWalletPk = wallet?.publicKey?.toBase58() || "unconnected";

  // Estado para controlar qué pantalla se muestra
  const [view, setView] = useState<'home' | 'dashboard' | 'create' | 'details' | 'staff' | 'purchase' | 'myticket' | 'ticketslist'>('home');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Inicializamos desde localStorage para que los eventos sobrevivan un refresh
  const [createdEvents, setCreatedEvents] = useState<CreatedEvent[]>(() => {
    try {
      const saved = localStorage.getItem(LS_EVENTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [collectionMint, setCollectionMint] = useState<string>(() => {
    return localStorage.getItem(LS_COLLECTION_KEY) || '';
  });

  const [ticketMint, setTicketMint] = useState<string>('');

  const [ownedTickets, setOwnedTickets] = useState<Array<{ eventId: number; mint: string; purchaseDate: number; readonly?: boolean; owner?: string }>>(() => {
    try {
      const saved = localStorage.getItem("mintpass_owned_tickets");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [eventStats, setEventStats] = useState<Record<number, { sold: number, checked: number }>>(() => {
    try {
      const saved = localStorage.getItem("mintpass_event_stats");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const updateStats = (id: number, type: 'sold' | 'checked', amount: number) => {
    setEventStats(prev => {
      const current = prev[id] || { sold: 0, checked: 0 };
      const next = { ...prev, [id]: { ...current, [type]: current[type] + amount } };
      localStorage.setItem("mintpass_event_stats", JSON.stringify(next));
      return next;
    });
  };

  // Cada vez que cambian los eventos creados, los persistimos en localStorage
  useEffect(() => {
    localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(createdEvents));
  }, [createdEvents]);

  useEffect(() => {
    if (collectionMint) {
      localStorage.setItem(LS_COLLECTION_KEY, collectionMint);
    }
  }, [collectionMint]);

  if (view === 'home') {
    return <Home 
      createdEvents={createdEvents}
      onGoToOrganizer={() => setView('dashboard')} 
      onGoToMyTickets={() => setView('ticketslist')}
      onEventClick={(id: number) => {
        setSelectedEventId(id);
        setView('purchase');
      }}
    />;
  }

  // Vista de compra (Buyer)
  if (view === 'purchase') {
    const evCreated = createdEvents.find(e => e.id === selectedEventId);
    let eventModel: EventModel;
    
    if (evCreated) {
      eventModel = {
         id: evCreated.id,
         name: evCreated.name,
         date: `${evCreated.date} · ${evCreated.time}`,
         duration: '3h',
         venue: evCreated.venue,
         price: evCreated.priceType === 'free' ? 0 : evCreated.price,
         total: evCreated.aforo,
         limitPerWallet: evCreated.limitPerWallet,
         sold: eventStats[evCreated.id]?.sold || 0,
         cat: evCreated.category,
         icon: 'Ticket',
         bg: '#534AB7', color: '#fff'
      };
    } else {
      const evDummy = EVENTS.find(e => e.id === selectedEventId) || EVENTS[0];
      eventModel = { ...evDummy, sold: eventStats[evDummy.id]?.sold || evDummy.sold };
    }

    return <BuyerPurchase 
      event={eventModel} 
      collectionMint={evCreated ? evCreated.collectionMint : collectionMint}
      ownedTicketsCount={ownedTickets.filter(t => t.eventId === eventModel.id && t.owner === currentWalletPk).length}
      onSuccessMint={(mintInfos, qty) => {
         updateStats(eventModel.id, 'sold', qty);
         
         // Normalizamos mintInfos para que siempre iteremos un arreglo (array)
         const mintsArray = Array.isArray(mintInfos) ? mintInfos : [mintInfos];
         
         // Actualizamos el ticket actual (usaremos el primero para mostrar el QR inmediato)
         setTicketMint(mintsArray[0]);

         setOwnedTickets(prev => {
            const next = [...prev];
            mintsArray.forEach(mintInfo => {
               next.push({ eventId: eventModel.id, mint: mintInfo, purchaseDate: Date.now(), owner: currentWalletPk });
            });
            localStorage.setItem("mintpass_owned_tickets", JSON.stringify(next));
            return next;
         });
      }}
      onBack={() => setView('home')} 
      onGoToMyTicket={() => setView('myticket')} 
    />;
  }

  // Vista del Ticket Comprado (Blink App/QR dinámico)
  if (view === 'myticket') {
    const ev = createdEvents.find(e => e.id === selectedEventId) || EVENTS.find(e => e.id === selectedEventId) || EVENTS[0];
    return <MyTicket 
      event={ev} 
      ticketMint={ticketMint || "11111111111111111111111111111111"}
      onBack={() => setView('ticketslist')} 
    />;
  }

  // Lista de Tickets de la Wallet
  if (view === 'ticketslist') {
    const allEvents = [...EVENTS, ...createdEvents];
    const myTickets = ownedTickets.filter(t => t.owner === currentWalletPk);
    return <TicketsList 
       tickets={myTickets} 
       allEvents={allEvents} 
       onBack={() => setView('home')} 
       onTicketClick={(mint) => {
          setTicketMint(mint);
          const t = ownedTickets.find(x => x.mint === mint);
          if (t) setSelectedEventId(t.eventId);
          setView('myticket');
       }} 
    />;
  }

  // Vista del dashboard de organizador
  if (view === 'dashboard') {
    return <OrganizerDashboard 
      createdEvents={createdEvents}
      eventStats={eventStats}
      onBack={() => setView('home')} 
      onCreate={() => setView('create')} 
      onEventClick={(id) => { setSelectedEventId(id); setView('details'); }} 
    />;
  }

  // Formulario de crear evento nuevo
  if (view === 'create') {
    return <CreateEvent 
      onBack={() => setView('dashboard')} 
      onSuccess={(newEvent) => {
        // Guardamos el evento creado en la lista y su collectionMint para compras futuras
        setCreatedEvents(prev => [...prev, newEvent]);
        setCollectionMint(newEvent.collectionMint);
        setView('dashboard');
      }} 
    />;
  }

  // Detalle del evento con simulación en tiempo real (Vista del organizador)
  if (view === 'details') {
    const ev = createdEvents.find(e => e.id === selectedEventId) || createdEvents[0];
    if (!ev) return null;
    return <EventDetails 
      event={ev} 
      stats={eventStats[ev.id]} 
      ownedTickets={ownedTickets.filter(t => t.eventId === ev.id)}
      onBack={() => setView('dashboard')} 
      onGoToStaff={() => setView('staff')} 
    />;
  }

  // Panel de Staff para escaneo de los códigos QRs
  if (view === 'staff') {
    const ev = createdEvents.find(e => e.id === selectedEventId) || createdEvents[0];
    return <StaffPanel event={ev} stats={eventStats[ev?.id]} onCheckIn={() => { if(ev) updateStats(ev.id, 'checked', 1); }} onBack={() => setView('details')} />;
  }

  return null;
}
