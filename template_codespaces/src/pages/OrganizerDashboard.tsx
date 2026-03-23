import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { getOrganizerReputation } from "../lib/metaplex";
import { CreatedEvent } from "./CreateEvent";

import "../index.css";

// Developer Comment: Ahora el dashboard recibe los eventos reales creados on-chain
export default function OrganizerDashboard({ createdEvents, onBack, onCreate, onEventClick }: { createdEvents: CreatedEvent[], onBack: () => void, onCreate: () => void, onEventClick: (id: number) => void }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [activeTab, setActiveTab] = useState('activos');

  // Developer Comment: Estado para almacenar el puntaje de reputación leído de la blockchain
  const [reputationScore, setReputationScore] = useState<number | null>(null);
  const [loadingRep, setLoadingRep] = useState(false);

  // Developer Comment: Al conectar la wallet, consultamos la PDA de reputación del organizador on-chain
  useEffect(() => {
    async function fetchReputation() {
      if (!wallet.publicKey) {
        setReputationScore(null);
        return;
      }
      setLoadingRep(true);
      try {
        const score = await getOrganizerReputation(connection, wallet.publicKey.toBase58());
        setReputationScore(score);
      } catch (e) {
        console.error("Error al consultar la reputación on-chain:", e);
        setReputationScore(0);
      } finally {
        setLoadingRep(false);
      }
    }
    fetchReputation();
  }, [wallet.publicKey, connection]);
  // Developer Comment: Mapeamos los eventos guardados en la wallet/sesión al formato visual del dashboard
  const categoryIcons: Record<string, string> = {
    'Música / Concierto': 'Music', 'Arte y cultura': 'Palette', 'Deporte': 'Activity',
    'Feria y mercado': 'ShoppingBag', 'Teatro y danza': 'Drama', 'Otro': 'Sparkles'
  };
  const categoryColors: Record<string, string> = {
    'Música / Concierto': 'cover-purple', 'Arte y cultura': 'cover-teal', 'Deporte': 'cover-coral',
    'Feria y mercado': 'cover-purple', 'Teatro y danza': 'cover-teal', 'Otro': 'cover-coral'
  };
  const categoryProgressColors: Record<string, string> = {
    'Música / Concierto': '#534AB7', 'Arte y cultura': '#1D9E75', 'Deporte': '#D85A30',
    'Feria y mercado': '#EF9F27', 'Teatro y danza': '#E879A8', 'Otro': '#534AB7'
  };

  // Developer Comment: Transformamos CreatedEvent[] a la estructura visual que usa el listado
  const events = createdEvents.map(ev => {
    const eventDate = ev.date ? new Date(ev.date + 'T12:00') : null;
    const isToday = eventDate && eventDate.toDateString() === new Date().toDateString();
    const isPast = eventDate && eventDate < new Date();
    const cat = isToday ? 'activos' : isPast ? 'pasados' : 'proximos';
    const dateStr = eventDate ? eventDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    const metaStr = `${dateStr}${ev.time ? ' · ' + ev.time + ' h' : ''} · ${ev.venue}`;
    const priceStr = ev.priceType === 'free' ? 'Gratis' : `${ev.price} ${ev.priceType.toUpperCase()}`;

    return {
      id: ev.id, cat, name: ev.name, meta: metaStr,
      coverText: categoryIcons[ev.category] || 'Sparkles',
      coverClass: categoryColors[ev.category] || 'cover-purple',
      progress: 0,
      progressColor: categoryProgressColors[ev.category] || '#534AB7',
      progressLabel: `0 / ${ev.aforo} entradas vendidas`,
      statusClass: isToday ? 's-active' : isPast ? 's-past' : 's-soon',
      statusText: isToday ? 'En curso' : isPast ? 'Terminado' : 'Próximo',
      price: priceStr,
      actions: ['Panel staff', 'Ver QR Blink', 'Compartir'],
      primaryAction: 0,
      collectionMint: ev.collectionMint
    };
  });

  const filteredEvents = events.filter(e => e.cat === activeTab);

  // Developer Comment: Función helper para mostrar el nivel de reputación
  const getReputationLevel = (score: number) => {
    if (score >= 50) return { label: 'Excelente', color: '#5DCAA5', icon: '⭐' };
    if (score >= 20) return { label: 'Buena', color: '#EF9F27', icon: '👍' };
    if (score > 0)  return { label: 'Nueva', color: '#AFA9EC', icon: '🆕' };
    return { label: 'Sin historial', color: '#666', icon: '—' };
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
          {/* Developer Comment: Reemplazamos el botón falso por WalletMultiButton real */}
          <WalletMultiButton className="wallet-chip" style={{ background: '#1a1a2e', color: '#AFA9EC', border: '1px solid #2a2a4a', padding: '6px 14px', fontSize: '12px', height: 'auto', lineHeight: 1, fontFamily: 'inherit' }} />
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
            <div className="stat-label">Eventos creados</div>
            <div className="stat-value">{createdEvents.length}</div>
            <div className="stat-sub">En esta sesión</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tickets vendidos</div>
            <div className="stat-value">0</div>
            <div className="stat-sub">Recién iniciado</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Asistentes hoy</div>
            <div className="stat-value">0</div>
            <div className="stat-sub">Pendiente</div>
          </div>
          {/* Developer Comment: Tarjeta de Reputación On-Chain del Organizador */}
          <div className="stat-card" style={{ borderColor: wallet.publicKey ? '#534AB7' : '#2a2a4a' }}>
            <div className="stat-label">Reputación on-chain</div>
            <div className="stat-value" style={{ color: reputationScore !== null ? getReputationLevel(reputationScore).color : '#666' }}>
              {loadingRep ? '...' : reputationScore !== null ? `${getReputationLevel(reputationScore).icon} ${reputationScore}` : '—'}
            </div>
            <div className="stat-sub">
              {!wallet.publicKey 
                ? 'Conecta wallet para ver' 
                : loadingRep 
                  ? 'Consultando blockchain...' 
                  : reputationScore !== null 
                    ? getReputationLevel(reputationScore).label
                    : 'Sin datos'}
            </div>
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
          {createdEvents.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Icons.PlusCircle size={40} color="#534AB7" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>Aún no has creado ningún evento</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>Presiona "Crear evento" para lanzar tu primera colección NFT en Solana</div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty-state">No hay eventos en esta categoría.</div>
          ) : (
            filteredEvents.map(ev => {
              const EventIcon = (Icons as any)[ev.coverText] || Icons.HelpCircle;
              return (
              <div className="event-card" key={ev.id} onClick={() => onEventClick(ev.id)}>
                <div className={`event-cover ${ev.coverClass}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EventIcon size={24} color="#fff" />
                </div>
                
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
                  <span className="event-price">{ev.price}</span>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
}
