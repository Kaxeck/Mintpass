'use client';
import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import WalletButton from "../components/WalletButton";
import { useWalletSession, useSolanaClient } from "@solana/react-hooks";
import { type Address } from "@solana/kit";
import { getOrganizerReputation } from "../lib/metaplex";
import { readAllEventsFromChain, type OnChainEventData } from "../lib/event-pda";
import { CreatedEvent } from "./CreateEvent";
import { LandingNavBar } from "../components/LandingNavBar";
import { LandingFooter } from "../components/LandingFooter";
import '../Home.css';

import { usePrivy } from "@privy-io/react-auth";
import { address as getAddress } from "@solana/kit";

export default function OrganizerDashboard({
  createdEvents,
  eventStats = {},
  onBack,
  onCreate,
  onEventClick,
  onGoToMyTickets,
  onGoToExplore,
}: {
  createdEvents: CreatedEvent[];
  eventStats?: Record<number, { sold: number; checked: number }>;
  onBack: () => void;
  onCreate: () => void;
  onEventClick: (id: number) => void;
  onGoToMyTickets?: () => void;
  onGoToExplore?: () => void;
}) {
  const { authenticated, user, ready } = usePrivy();
  const session = useWalletSession();
  const client = useSolanaClient();
  const rpcRaw = client?.runtime?.rpc;
  const [activeTab, setActiveTab] = useState('activos');

  // Wrapper que adapta la API RPC de @solana/kit a la interfaz esperada
  const rpc = rpcRaw ? {
    async getAccountInfo(address: Address) {
      const result = await (rpcRaw.getAccountInfo as any)(address, { encoding: 'base64' }).send();
      if (!result.value) return null;
      const decoded = Buffer.from(result.value.data[0], 'base64');
      return { data: new Uint8Array(decoded) };
    }
  } : null;

  const [reputationScore, setReputationScore] = useState<number | null>(null);
  const [loadingRep, setLoadingRep] = useState(false);

  const [onChainEvents, setOnChainEvents] = useState<OnChainEventData[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Determinar la wallet conectada usando Privy o el adaptador de solana
  const walletAddressStr = user?.wallet?.address || session?.account?.address?.toString() || null;
  const walletAddress: Address | null = walletAddressStr ? getAddress(walletAddressStr) : null;
  const isConnected = authenticated || !!walletAddressStr;

  // Consultar reputación on-chain
  useEffect(() => {
    async function fetchReputation() {
      if (!walletAddress) {
        setReputationScore(null);
        return;
      }
      if (!rpc) return;
      setLoadingRep(true);
      try {
        const score = await getOrganizerReputation(rpc, walletAddress);
        setReputationScore(score);
      } catch (e) {
        console.error("Error al consultar la reputación on-chain:", e);
        setReputationScore(0);
      } finally {
        setLoadingRep(false);
      }
    }
    fetchReputation();
  }, [walletAddress, client]);

  // Leer eventos desde las PDAs on-chain
  useEffect(() => {
    async function fetchOnChainEvents() {
      if (!walletAddress) {
        setOnChainEvents([]);
        return;
      }
      const knownMints = createdEvents.map(ev => ev.collectionMint);
      if (knownMints.length === 0) return;

      if (!rpc) return;
      setLoadingEvents(true);
      try {
        const chainEvents = await readAllEventsFromChain(rpc, walletAddress, knownMints);
        setOnChainEvents(chainEvents);
        console.log(`Leídos ${chainEvents.length} eventos desde blockchain.`);
      } catch (e) {
        console.error("Error al leer eventos desde la blockchain:", e);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchOnChainEvents();
  }, [walletAddress, client, createdEvents]);

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
      progress,
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

  const getReputationLevel = (score: number) => {
    if (score >= 50) return { label: 'Excelente', color: '#5DCAA5', icon: '⭐' };
    if (score >= 20) return { label: 'Buena', color: '#EF9F27', icon: '👍' };
    if (score > 0) return { label: 'Nueva', color: '#AFA9EC', icon: '🆕' };
    return { label: 'Sin historial', color: '#666', icon: '—' };
  };

  // Remove the unauthenticated landing page block since the router now handles it

  return (
    <div className="lp-container" style={{ background: '#F7F8F7', minHeight: '100vh' }}>
      <header className="lp-nav" style={{ padding: '14px 16px', background: '#1E1E1E', borderBottom: '0.5px solid #333', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="lp-nav-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #333', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFF' }}>
              <Icons.ArrowLeft size={18} />
            </button>
            <span className="lp-nav-brand" style={{ color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/icon.png" alt="Logo" style={{ height: '24px' }} />
              <span>Mint<span style={{ color: '#4BAA46' }}>pass</span></span>
            </span>
            <span style={{ background: 'rgba(75, 170, 70, 0.15)', color: '#4BAA46', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginLeft: '8px' }}>
              Organizador
            </span>
          </div>
          <div className="lp-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <nav className="lp-nav-links" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <button type="button" className="lp-nav-btn" onClick={onGoToExplore}>Explorar</button>
              <button type="button" className="lp-nav-btn" onClick={onGoToMyTickets}>Mis tickets</button>
              <button type="button" className="lp-nav-btn" onClick={() => {}}>Organizadores</button>
            </nav>
            <WalletButton style={{ border: '0.5px solid #333', borderRadius: '8px', padding: '6px 14px', color: '#FFF', background: 'transparent', fontSize: '13px', fontFamily: 'inherit', height: 'auto', lineHeight: 1 }} />
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4BAA46', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>KR</div>
          </div>
        </div>
      </header>

      <main className="lp-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px', width: '100%' }}>
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
          <div className="stat-card" style={{ borderColor: walletAddress ? '#534AB7' : '#2a2a4a' }}>
            <div className="stat-label">Reputación on-chain</div>
            <div className="stat-value" style={{ color: reputationScore !== null ? getReputationLevel(reputationScore).color : '#666' }}>
              {loadingRep ? '...' : reputationScore !== null ? `${getReputationLevel(reputationScore).icon} ${reputationScore}` : '—'}
            </div>
            <div className="stat-sub">
              {!walletAddress
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
              const EventIcon = (Icons as Record<string, unknown>)[ev.coverText] as typeof Icons.HelpCircle || Icons.HelpCircle;
              const isVerifiedOnChain = onChainEvents.some(oc => oc.collectionMint === ev.collectionMint);
              return (
                <div className="event-card" key={ev.id} onClick={() => onEventClick(ev.id)}>
                  <div className={`event-cover ${ev.coverClass}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EventIcon size={24} color="#fff" />
                  </div>

                  <div className="event-info">
                    <div className="event-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {ev.name}
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
      </main>
      <LandingFooter />
    </div>
  );
}