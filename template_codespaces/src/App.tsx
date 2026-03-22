import { useState } from "react";
import CreateEvent from "./CreateEvent";
import EventDetails from "./EventDetails";
import StaffPanel from "./StaffPanel";
import OrganizerDashboard from "./OrganizerDashboard";
import Home from "./Home";
import "./index.css";

export default function App() {
  // Estado para controlar qué pantalla se muestra
  const [view, setView] = useState<'home' | 'dashboard' | 'create' | 'details' | 'staff'>('home');

  // Vista Landing principal para compradores
  if (view === 'home') {
    return <Home onGoToOrganizer={() => setView('dashboard')} />;
  }

  // Vista del dashboard de organizador
  if (view === 'dashboard') {
    return <OrganizerDashboard 
      onCreate={() => setView('create')} 
      onEventClick={() => setView('details')} 
    />;
  }

  // Formulario de crear evento nuevo
  if (view === 'create') {
    return <CreateEvent onBack={() => setView('dashboard')} onSuccess={() => setView('details')} />;
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
