import { useState } from "react";
import "./index.css";

export default function OrganizerDashboard({ onBack, onCreate, onEventClick }: { onBack: () => void, onCreate: () => void, onEventClick: (id: number) => void }) {
  const [activeTab, setActiveTab] = useState('activos');
  const [walletOn, setWalletOn] = useState(false);

  const events = [
    {
      id: 1, cat: 'activos', name: 'Noche de Jazz — CDMX', meta: 'Hoy · 21:00 h · Foro Indie, Roma Norte',
      coverText: '🎵', coverClass: 'cover-purple', progress: 78, progressColor: '#534AB7', progressLabel: '156 / 200 entradas vendidas',
      statusClass: 's-active', statusText: 'En curso', price: '0.05 SOL', actions: ['Panel staff', 'Ver QR Blink', 'Compartir'], primaryAction: 0
    },
    {
      id: 2, cat: 'proximos', name: 'Expo Diseño Independiente', meta: 'Sáb 29 Mar · 12:00 h · La Ciudadela',
      coverText: '🎨', coverClass: 'cover-teal', progress: 34, progressColor: '#1D9E75', progressLabel: '102 / 300 entradas vendidas',
      statusClass: 's-soon', statusText: 'Próximo', price: 'Gratis', actions: ['Ver QR Blink', 'Editar', 'Compartir']
    },
    {
      id: 3, cat: 'proximos', name: 'Torneo Fut 7 — León', meta: 'Dom 30 Mar · 09:00 h · Unidad Deportiva',
      coverText: '⚽', coverClass: 'cover-coral', progress: 55, progressColor: '#D85A30', progressLabel: '22 / 40 equipos registrados',
      statusClass: 's-soon', statusText: 'Próximo', price: '0.02 SOL', actions: ['Ver QR Blink', 'Editar', 'Compartir']
    },
    {
      id: 4, cat: 'pasados', name: 'Open Mic — Guadalajara', meta: '15 Mar · 127 asistentes',
      coverText: '🎤', coverClass: '', coverStyle: { background: 'var(--color-background-tertiary)' }, progress: 100, progressColor: '#555555', progressLabel: '127 / 127 — sold out',
      statusClass: 's-past', statusText: 'Terminado', price: '0.03 SOL', priceStyle: { color: 'var(--color-text-tertiary)' }, actions: ['Ver POAPs', 'Estadísticas']
    }
  ];

  const filteredEvents = events.filter(e => e.cat === activeTab);

  const handleWalletClick = () => {
    setWalletOn(!walletOn);
  };

  return (
    <div className="app">
      <div className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="nav-back" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="nav-brand">
            <div className="nav-logo">
              <svg viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1.5" fill="#fff" />
                <rect x="9" y="2" width="5" height="5" rx="1.5" fill="#fff" opacity=".6" />
                <rect x="2" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".6" />
                <rect x="9" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".3" />
              </svg>
            </div>
            <span className="nav-name">Mintpass Organizador</span>
          </div>
        </div>
        
        <div className="nav-right">
          <div className="wallet-chip" onClick={handleWalletClick} style={{ cursor: 'pointer', borderColor: walletOn ? '#534AB7' : '', color: walletOn ? '#AFA9EC' : '' }}>
            {walletOn ? '7xKf…9pQm' : "Conectar Wallet"}
          </div>
          <div className="avatar">KR</div>
        </div>
      </div>

      <div className="main">
        <div className="page-header">
          <div>
            <div className="page-title">Mis eventos</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Bienvenido, Keith</div>
          </div>
          <button className="btn-primary" onClick={onCreate}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Crear evento
          </button>
        </div>

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

        <div className="event-list" id="event-list">
          {filteredEvents.length === 0 ? (
            <div className="empty-state">No hay eventos en esta categoría.</div>
          ) : (
            filteredEvents.map(ev => (
              <div className="event-card" key={ev.id} onClick={() => onEventClick(ev.id)}>
                <div className={`event-cover ${ev.coverClass}`} style={{ fontSize: '24px', ...(ev.coverStyle || {}) }}>{ev.coverText}</div>
                
                <div className="event-info">
                  <div className="event-name">{ev.name}</div>
                  <div className="event-meta">{ev.meta}</div>
                  
                  <div className="event-bar-wrap">
                    <div className="event-bar" style={{ width: `${ev.progress}%`, background: ev.progressColor }}></div>
                  </div>
                  <div className="event-bar-label">{ev.progressLabel}</div>
                  
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
                  <span className="event-price" style={ev.priceStyle || {}}>{ev.price}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
