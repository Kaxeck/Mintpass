import { useState } from "react";
import CreateEvent from "./pages/CreateEvent";
import EventDetails from "./pages/EventDetails";
import StaffPanel from "./pages/StaffPanel";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import Home from "./pages/Home";
import BuyerPurchase from "./pages/BuyerPurchase";
import MyTicket from "./pages/MyTicket";
import { EVENTS } from "./data/events";
import "./index.css";

export default function App() {
  // Estado para controlar qué pantalla se muestra
  const [view, setView] = useState<'home' | 'dashboard' | 'create' | 'details' | 'staff' | 'purchase' | 'myticket'>('home');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Developer Comment: Añadimos persistencia en memoria para el Collection Mint del evento y el Mint del Ticket
  const [collectionMint, setCollectionMint] = useState<string>('');
  const [ticketMint, setTicketMint] = useState<string>('');

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
      onBack={() => setView('home')} 
      onCreate={() => setView('create')} 
      onEventClick={() => setView('details')} 
    />;
  }

  // Formulario de crear evento nuevo
  if (view === 'create') {
    return <CreateEvent 
      onBack={() => setView('dashboard')} 
      onSuccess={(newCollectionAddr) => {
        setCollectionMint(newCollectionAddr);
        setView('details');
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
