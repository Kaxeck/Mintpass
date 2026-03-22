import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import CreateEvent from "./CreateEvent";
import EventDetails from "./EventDetails";
import "./index.css";

export default function App() {
  // Estado para controlar qué pantalla se muestra
  const [view, setView] = useState<'dashboard' | 'create' | 'details'>('dashboard');

  // Hook de Solana para manejar la conexión de la billetera (Phantom, Solflare, etc.)
  const { connectors, connect, disconnect, wallet, status } = useWalletConnection();
  
  // Obtenemos la dirección pública de la billetera conectada (si la hay)
  const address = wallet?.account.address.toString();
  
  // Estado local para manejar las pestañas ("activos", "proximos", "pasados")
  const [activeTab, setActiveTab] = useState('activos');

  // Datos mockeados de los eventos (normalmente vendrían de una API o del contrato de Anchor)
  const events = [
    {
      id: 1,
      cat: 'activos',
      name: 'Noche de Jazz — CDMX',
      meta: 'Hoy · 21:00 h · Foro Indie, Roma Norte',
      coverText: '🎵',
      coverClass: 'cover-purple',
      progress: 78,
      progressColor: '#534AB7',
      progressLabel: '156 / 200 entradas vendidas',
      statusClass: 's-active',
      statusText: 'En curso',
      price: '0.05 SOL',
      actions: ['Panel staff', 'Ver QR Blink', 'Compartir'],
      primaryAction: 0
    },
    {
      id: 2,
      cat: 'proximos',
      name: 'Expo Diseño Independiente',
      meta: 'Sáb 29 Mar · 12:00 h · La Ciudadela',
      coverText: '🎨',
      coverClass: 'cover-teal',
      progress: 34,
      progressColor: '#1D9E75',
      progressLabel: '102 / 300 entradas vendidas',
      statusClass: 's-soon',
      statusText: 'Próximo',
      price: 'Gratis',
      actions: ['Ver QR Blink', 'Editar', 'Compartir']
    },
    {
      id: 3,
      cat: 'proximos',
      name: 'Torneo Fut 7 — León',
      meta: 'Dom 30 Mar · 09:00 h · Unidad Deportiva',
      coverText: '⚽',
      coverClass: 'cover-coral',
      progress: 55,
      progressColor: '#D85A30',
      progressLabel: '22 / 40 equipos registrados',
      statusClass: 's-soon',
      statusText: 'Próximo',
      price: '0.02 SOL',
      actions: ['Ver QR Blink', 'Editar', 'Compartir']
    },
    {
      id: 4,
      cat: 'pasados',
      name: 'Open Mic — Guadalajara',
      meta: '15 Mar · 127 asistentes',
      coverText: '🎤',
      coverClass: '',
      coverStyle: { background: '#F1EFE8' },
      progress: 100,
      progressColor: '#B4B2A9',
      progressLabel: '127 / 127 — sold out',
      statusClass: 's-past',
      statusText: 'Terminado',
      price: '0.03 SOL',
      priceStyle: { color: 'var(--color-text-tertiary)' },
      actions: ['Ver POAPs', 'Estadísticas']
    }
  ];

  // Filtramos los eventos según la pestaña seleccionada
  const filteredEvents = events.filter(e => e.cat === activeTab);

  // Lógica para conectar/desconectar la wallet
  const handleWalletClick = () => {
    if (address) {
      disconnect(); // Si ya está conectado, desconecta
    } else {
      // Intentamos conectar primero con Phantom, si no está disponible, usamos el primer proveedor
      const targetConnector = connectors.find(c => c.id === 'phantom') || connectors[0];
      if (targetConnector) connect(targetConnector.id);
    }
  };

  // Renderizamos el formulario de crear si es la vista elegida
  if (view === 'create') {
    return <CreateEvent onBack={() => setView('dashboard')} onSuccess={() => setView('details')} />;
  }

  // Renderizamos el detalle
  if (view === 'details') {
    return <EventDetails onBack={() => setView('dashboard')} />;
  }

  // De lo contrario, renderizamos el Dashboard principal
  return (
    <div className="app">
      {/* ======= NAVBAR ======= */}
      <div className="navbar">
        <div className="nav-brand">
          <div className="nav-logo">
            <svg viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1.5" fill="#fff" />
              <rect x="9" y="2" width="5" height="5" rx="1.5" fill="#fff" opacity=".6" />
              <rect x="2" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".6" />
              <rect x="9" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".3" />
            </svg>
          </div>
          <span className="nav-name">Mintpass</span>
        </div>
        
        <div className="nav-right">
          <div className="wallet-chip" onClick={handleWalletClick}>
            {/* Muestra conectando, la address formateada (ej. 3xK7…f9Qp), o "Conectar" */}
            {status === "connecting" ? "Conectando..." : address ? `${address.slice(0, 4)}…${address.slice(-4)}` : "Conectar Wallet"}
          </div>
          <div className="avatar">KR</div>
        </div>
      </div>

      {/* ======= CONTENIDO PRINCIPAL ======= */}
      <div className="main">
        
        {/* Encabezado y botón de crear evento */}
        <div className="page-header">
          <div>
            <div className="page-title">Mis eventos</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Bienvenido, Keith</div>
          </div>
          <button className="btn-primary" onClick={() => setView('create')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Crear evento
          </button>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Eventos activos</div>
            <div className="stat-value">3</div>
            <div className="stat-sub">Este mes</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tickets vendidos</div>
            <div className="stat-value">284</div>
            <div className="stat-sub">+42 esta semana</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Asistentes hoy</div>
            <div className="stat-value">97</div>
            <div className="stat-sub">En curso ahora</div>
          </div>
        </div>

        {/* Pestañas de navegación ("Activos", "Próximos", "Pasados") */}
        <div className="section-header">
          <div className="tab-bar" style={{ border: 'none', margin: 0 }}>
            <div className={`ttab ${activeTab === 'activos' ? 'on' : ''}`} onClick={() => setActiveTab('activos')}>Activos</div>
            <div className={`ttab ${activeTab === 'proximos' ? 'on' : ''}`} onClick={() => setActiveTab('proximos')}>Próximos</div>
            <div className={`ttab ${activeTab === 'pasados' ? 'on' : ''}`} onClick={() => setActiveTab('pasados')}>Pasados</div>
          </div>
          <div className="filter-tabs">
            <div className="ftab on">Todos</div>
            <div className="ftab">Hoy</div>
          </div>
        </div>

        {/* Lista de eventos renderizada dinámicamente según la pestaña activa */}
        <div className="event-list" id="event-list">
          {filteredEvents.length === 0 ? (
            <div className="empty-state">No hay eventos en esta categoría.</div>
          ) : (
            filteredEvents.map(ev => (
              <div className="event-card" key={ev.id} onClick={() => setView('details')}>
                <div className={`event-cover ${ev.coverClass}`} style={{ fontSize: '24px', ...ev.coverStyle }}>{ev.coverText}</div>
                
                <div className="event-info">
                  <div className="event-name">{ev.name}</div>
                  <div className="event-meta">{ev.meta}</div>
                  
                  {/* Barra de progreso de ventas/asistencia */}
                  <div className="event-bar-wrap">
                    <div className="event-bar" style={{ width: `${ev.progress}%`, background: ev.progressColor }}></div>
                  </div>
                  <div className="event-bar-label">{ev.progressLabel}</div>
                  
                  {/* Botones de acción variables por tarjeta */}
                  <div className="event-actions">
                    {ev.actions.map((action, idx) => (
                      <button
                        key={idx}
                        className={`btn-sm ${idx === ev.primaryAction ? 'btn-sm-purple' : ''}`}
                        onClick={(e) => { e.stopPropagation(); alert(`Acción: ${action}`); }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="event-right">
                  <span className={`status-pill ${ev.statusClass}`}>{ev.statusText}</span>
                  <span className="event-price" style={ev.priceStyle}>{ev.price}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
