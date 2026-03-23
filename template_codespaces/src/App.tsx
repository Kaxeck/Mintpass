import { useState, useEffect } from "react";
import CreateEvent, { CreatedEvent } from "./pages/CreateEvent";
import EventDetails from "./pages/EventDetails";
import StaffPanel from "./pages/StaffPanel";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import Home from "./pages/Home";
import BuyerPurchase from "./pages/BuyerPurchase";
import MyTicket from "./pages/MyTicket";
import { EVENTS } from "./data/events";
import "./index.css";

// Developer Comment: Claves de localStorage para persistir eventos entre sesiones
const LS_EVENTS_KEY = "mintpass_created_events";
const LS_COLLECTION_KEY = "mintpass_last_collection";

export default function App() {
  // Estado para controlar qué pantalla se muestra
  const [view, setView] = useState<'home' | 'dashboard' | 'create' | 'details' | 'staff' | 'purchase' | 'myticket'>('home');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Developer Comment: Inicializamos desde localStorage para que los eventos sobrevivan un refresh
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

  // Developer Comment: Cada vez que cambian los eventos creados, los persistimos en localStorage
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
      onGoToOrganizer={() => setView('dashboard')} 
      onEventClick={(id: number) => {
        setSelectedEventId(id);
        setView('purchase');
      }}
    />;
  }

  // Vista de compra (Buyer)
  if (view === 'purchase') {
    const ev = EVENTS.find(e => e.id === selectedEventId) || EVENTS[0];
    return <BuyerPurchase 
      event={ev} 
      collectionMint={collectionMint}
      onSuccessMint={(mintInfo) => setTicketMint(mintInfo)}
      onBack={() => setView('home')} 
      onGoToMyTicket={() => setView('myticket')} 
    />;
  }

  // Vista del Ticket Comprado (Blink App/QR dinámico)
  if (view === 'myticket') {
    const ev = EVENTS.find(e => e.id === selectedEventId) || EVENTS[0];
    return <MyTicket 
      event={ev} 
      ticketMint={ticketMint || "11111111111111111111111111111111"}
      onBack={() => setView('purchase')} 
    />;
  }

  // Vista del dashboard de organizador
  if (view === 'dashboard') {
    return <OrganizerDashboard 
      createdEvents={createdEvents}
      onBack={() => setView('home')} 
      onCreate={() => setView('create')} 
      onEventClick={() => setView('details')} 
    />;
  }

  // Formulario de crear evento nuevo
  if (view === 'create') {
    return <CreateEvent 
      onBack={() => setView('dashboard')} 
      onSuccess={(newEvent) => {
        // Developer Comment: Guardamos el evento creado en la lista y su collectionMint para compras futuras
        setCreatedEvents(prev => [...prev, newEvent]);
        setCollectionMint(newEvent.collectionMint);
        setView('dashboard');
      }} 
    />;
  }

  // Detalle del evento con simulación en tiempo real (Vista del organizador)
  if (view === 'details') {
    return <EventDetails onBack={() => setView('dashboard')} onGoToStaff={() => setView('staff')} />;
  }

  // Panel de Staff para escaneo de los códigos QRs
  if (view === 'staff') {
    return <StaffPanel onBack={() => setView('details')} />;
  }

  return null;
}
