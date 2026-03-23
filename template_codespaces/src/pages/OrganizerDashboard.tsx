import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { getOrganizerReputation } from "../lib/metaplex";
import { readAllEventsFromChain, OnChainEventData } from "../lib/event-pda";
import { CreatedEvent } from "./CreateEvent";

import "../index.css";

// Ahora el dashboard recibe los eventos reales creados on-chain y ventas
export default function OrganizerDashboard({ createdEvents, eventStats = {}, onBack, onCreate, onEventClick }: { createdEvents: CreatedEvent[], eventStats?: Record<number, { sold: number, checked: number }>, onBack: () => void, onCreate: () => void, onEventClick: (id: number) => void }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [activeTab, setActiveTab] = useState('activos');

  // Estado para almacenar el puntaje de reputación leído de la blockchain
  const [reputationScore, setReputationScore] = useState<number | null>(null);
  const [loadingRep, setLoadingRep] = useState(false);

  // Eventos leídos directamente desde las PDAs on-chain
  const [onChainEvents, setOnChainEvents] = useState<OnChainEventData[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Al conectar la wallet, consultamos la PDA de reputación del organizador on-chain
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

  // Al conectar la wallet, también leemos los eventos guardados en las PDAs on-chain
  useEffect(() => {
    async function fetchOnChainEvents() {
      if (!wallet.publicKey) {
        setOnChainEvents([]);
        return;
      }
      // Obtenemos los collectionMints conocidos de los eventos creados en la sesión
      const knownMints = createdEvents.map(ev => ev.collectionMint);
      if (knownMints.length === 0) return;

      setLoadingEvents(true);
      try {
        const chainEvents = await readAllEventsFromChain(connection, wallet.publicKey, knownMints);
        setOnChainEvents(chainEvents);
        console.log(`Leídos ${chainEvents.length} eventos desde blockchain.`);
      } catch (e) {
        console.error("Error al leer eventos desde la blockchain:", e);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchOnChainEvents();
  }, [wallet.publicKey, connection, createdEvents]);
  // Mapeamos los eventos guardados en la wallet/sesión al formato visual del dashboard
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

  // Transformamos CreatedEvent[] a la estructura visual que usa el listado
  const events = createdEvents.map(ev => {
    const eventDate = ev.date ? new Date(ev.date + 'T12:00') : null;
    const isToday = eventDate && eventDate.toDateString() === new Date().toDateString();
    const isPast = eventDate && eventDate < new Date();
    const cat = isToday ? 'activos' : isPast ? 'pasados' : 'proximos';
    const dateStr = eventDate ? eventDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    const metaStr = `${dateStr}${ev.time ? ' · ' + ev.time + ' h' : ''} · ${ev.venue}`;
    const priceStr = ev.priceType === 'free' ? 'Gratis' : `${ev.price} ${ev.priceType.toUpperCase()}`;

    const sold = eventStats[ev.id]?.sold || 0;
    const progress = Math.round((sold / (ev.aforo || 1)) * 100);

    return {
      id: ev.id, cat, name: ev.name, meta: metaStr,
      coverText: categoryIcons[ev.category] || 'Sparkles',
      coverClass: categoryColors[ev.category] || 'cover-purple',
      progress: progress,
      progressColor: categoryProgressColors[ev.category] || '#534AB7',
      progressLabel: `${sold} / ${ev.aforo} entradas vendidas`,
      statusClass: isToday ? 's-active' : isPast ? 's-past' : 's-soon',
      statusText: isToday ? 'En curso' : isPast ? 'Terminado' : 'Próximo',
      price: priceStr,
      actions: ['Panel staff', 'Ver QR Blink', 'Compartir'],
      primaryAction: 0,
      collectionMint: ev.collectionMint
    };
  });

  const filteredEvents = events.filter(e => e.cat === activeTab);

  // Función helper para mostrar el nivel de reputación
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
          {/* Reemplazamos el botón falso por WalletMultiButton real */}
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
            <div className="stat-value">{Object.values(eventStats).reduce((acc, curr) => acc + curr.sold, 0)}</div>
            <div className="stat-sub">Acumulado local</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Asistentes hoy</div>
            <div className="stat-value">{Object.values(eventStats).reduce((acc, curr) => acc + curr.checked, 0)}</div>
            <div className="stat-sub">Total validados</div>
          </div>
          {/* Tarjeta de Reputación On-Chain del Organizador */}
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
          {/* Indicador de carga mientras se consultan las PDAs en blockchain */}
          {loadingEvents && (
            <div style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: '#AFA9EC' }}>
              ⛓️ Consultando eventos en la blockchain de Solana...
            </div>
          )}

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
              {/* Verificamos si este evento fue leído exitosamente desde la PDA on-chain */}
              const isVerifiedOnChain = onChainEvents.some(oc => oc.collectionMint === ev.collectionMint);
              return (
              <div className="event-card" key={ev.id} onClick={() => onEventClick(ev.id)}>
                <div className={`event-cover ${ev.coverClass}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EventIcon size={24} color="#fff" />
                </div>
                
                <div className="event-info">
                  <div className="event-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {ev.name}
                    {/* Badge de verificación on-chain */}
                    {isVerifiedOnChain && (
                      <span title="Evento verificado en blockchain" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', background: 'rgba(93,202,165,0.15)', color: '#5DCAA5', padding: '2px 6px', borderRadius: '8px', fontWeight: 600 }}>
                        <Icons.ShieldCheck size={10} /> On-chain
                      </span>
                    )}
                  </div>
                  <div className="event-meta">{ev.meta}</div>
                  
                  <div className="event-bar-wrap">
                    <div className="event-bar" style={{ width: `${ev.progress}%`, background: ev.progressColor }}></div>
                  </div>
                  <div className="event-bar-label">{ev.progressLabel}</div>
                  
                  {/* Mostramos el collectionMint truncado como referencia on-chain */}
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontFamily: 'monospace' }}>
                    🔗 {ev.collectionMint.slice(0, 8)}...{ev.collectionMint.slice(-4)}
                  </div>
                  
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
