'use client';
import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import WalletButton from "../components/WalletButton";
import { useWalletSession, useSolanaClient } from "@solana/react-hooks";
import { type Address } from "@solana/kit";
import { getOrganizerReputation } from "../lib/metaplex";
import { readAllEventsFromChain, type OnChainEventData } from "../lib/event-pda";
import { CreatedEvent } from "./CreateEvent";

export default function OrganizerDashboard({
  createdEvents,
  eventStats = {},
  onBack,
  onCreate,
  onEventClick,
}: {
  createdEvents: CreatedEvent[];
  eventStats?: Record<number, { sold: number; checked: number }>;
  onBack: () => void;
  onCreate: () => void;
  onEventClick: (id: number) => void;
}) {
  const session = useWalletSession();
  const client = useSolanaClient();
  const rpcRaw = client?.runtime?.rpc;
  const [activeTab, setActiveTab] = useState('activos');

  // Wrapper que adapta la API RPC de @solana/kit (PendingRpcRequest) 
  // a la interfaz simple esperada por nuestras funciones lib.
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

  const walletAddress: Address | null = session?.account?.address ?? null;
  const walletAddressStr = walletAddress?.toString() ?? "";

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
    if (score > 0)  return { label: 'Nueva', color: '#AFA9EC', icon: '🆕' };
    return { label: 'Sin historial', color: '#666', icon: '—' };
  };

  if (!walletAddress) {
    return (
      <div className="org-container">
        <div className="org-content">
          <div className="org-nav">
            <span className="org-nav-brand">
              <img src="/icon.png" alt="Logo" />
              <span>Mint<span style={{ color: '#4BAA46' }}>pass</span></span>
            </span>
            <div className="org-nav-right">
              <div className="org-nav-links">
                <span style={{ cursor: 'pointer' }} onClick={onBack}>Para asistentes</span>
                <span style={{ color: '#1E1E1E', fontWeight: 500 }}>Organizadores</span>
              </div>
              <WalletButton style={{ border: '0.5px solid #D3D1C7', borderRadius: '8px', padding: '6px 14px', color: '#1E1E1E', background: 'transparent', fontSize: '13px', fontFamily: 'inherit', height: 'auto', lineHeight: 1 }} />
            </div>
          </div>

          <div className="org-hero">
            <div className="org-hero-text">
              <p className="org-hero-tag">INFRAESTRUCTURA SOBRE SOLANA</p>
              <p className="org-hero-title">Opera tu evento sin<br/>construir tecnología propia</p>
              <p className="org-hero-sub">Boletos verificables on-chain, check-in offline, reventa controlada y reputación portable. Tú te enfocas en el evento.</p>
              <div className="org-hero-btns">
                <div style={{ background: '#14F195', color: '#1E1E1E', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} onClick={() => alert("Conecta tu wallet primero")}>Crear mi evento gratis</div>
                <div style={{ border: '0.5px solid #D3D1C7', color: '#1E1E1E', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>Ver cómo funciona</div>
              </div>
            </div>
            <div className="org-hero-preview">
              <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#B4B2A9' }}>Dashboard en vivo</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1, background: '#2C2C2A', borderRadius: '8px', padding: '8px' }}>
                  <p style={{ margin: 0, fontSize: '9px', color: '#9FE1CB' }}>Vendidos</p>
                  <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 500 }}>842</p>
                </div>
                <div style={{ flex: 1, background: '#2C2C2A', borderRadius: '8px', padding: '8px' }}>
                  <p style={{ margin: 0, fontSize: '9px', color: '#9FE1CB' }}>Ingresos</p>
                  <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 500 }}>$584k</p>
                </div>
              </div>
              <div style={{ background: '#2C2C2A', borderRadius: '8px', padding: '8px' }}>
                <p style={{ margin: 0, fontSize: '9px', color: '#9FE1CB' }}>Reputación on-chain</p>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 500 }}>92 / 100</p>
              </div>
            </div>
          </div>

          <div className="org-stats-strip">
            <div className="org-stat-item">
              <p className="org-stat-title">4 programas</p>
              <p className="org-stat-sub">Anchor auditables</p>
            </div>
            <div className="org-stat-item">
              <p className="org-stat-title">Multisig 2-de-3</p>
              <p className="org-stat-sub">Squads Protocol</p>
            </div>
            <div className="org-stat-item">
              <p className="org-stat-title">$0 setup</p>
              <p className="org-stat-sub">Free tier para MVP</p>
            </div>
            <div className="org-stat-item">
              <p className="org-stat-title">Offline-first</p>
              <p className="org-stat-sub">Check-in sin internet</p>
            </div>
          </div>

          <div className="org-features">
            <p className="org-features-title">Todo lo que necesitas para operar tu evento</p>
            <div className="org-features-grid">
              <div className="org-feat-card">
                <p className="org-feat-card-title">Creación de eventos</p>
                <p className="org-feat-card-desc">Precio, aforo, tipos de boleto</p>
              </div>
              <div className="org-feat-card">
                <p className="org-feat-card-title">Venta multicanal</p>
                <p className="org-feat-card-desc">Fiat, wallet y Blinks</p>
              </div>
              <div className="org-feat-card">
                <p className="org-feat-card-title">Check-in en puerta</p>
                <p className="org-feat-card-desc">PWA offline-first</p>
              </div>
              <div className="org-feat-card">
                <p className="org-feat-card-title">Antifraude por capas</p>
                <p className="org-feat-card-desc">QR dinámico, blacklist</p>
              </div>
              <div className="org-feat-card">
                <p className="org-feat-card-title">Reventa oficial</p>
                <p className="org-feat-card-desc">Tope de precio on-chain</p>
              </div>
              <div className="org-feat-card">
                <p className="org-feat-card-title">Reputación y datos</p>
                <p className="org-feat-card-desc">Historial verificable</p>
              </div>
            </div>
          </div>

          <div className="org-plans">
            <p className="org-plans-title">Planes</p>
            <div className="org-plans-grid">
              <div className="org-plan-card">
                <p className="org-plan-name">Free</p>
                <p className="org-plan-price">Comisión por boleto</p>
                <p className="org-plan-desc">1 evento activo · reportes básicos</p>
              </div>
              <div className="org-plan-card highlight">
                <span className="org-plan-badge">Más elegido</span>
                <p className="org-plan-name">Pro</p>
                <p className="org-plan-price">Comisión + mensualidad</p>
                <p className="org-plan-desc">Eventos ilimitados · analytics · rewards</p>
              </div>
              <div className="org-plan-card">
                <p className="org-plan-name">Enterprise</p>
                <p className="org-plan-price">Cotización</p>
                <p className="org-plan-desc">Custom branding · soporte dedicado</p>
              </div>
            </div>
          </div>

          <div className="org-cta">
            <p className="org-cta-title">¿Listo para operar tu próximo evento?</p>
            <div style={{ display: 'inline-block', background: '#14F195', color: '#1E1E1E', padding: '12px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} onClick={() => alert("Conecta tu wallet primero")}>
              Crear mi evento gratis
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 1 }}>
          <div className="nav-back" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <img src="/icon.png" alt="Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize: '22px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', letterSpacing: '-0.5px' }}>
              <span style={{ color: '#4AA844', fontWeight: 800 }}>Mint</span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>pass</span>
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontWeight: 600, fontSize: '14px', color: '#AFA9EC', letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(83,74,183,0.15)', padding: '4px 12px', border: '1px solid rgba(83,74,183,0.3)', borderRadius: '20px' }}>
          Organizador
        </div>
        
        <div className="nav-right">
          <WalletButton className="wallet-chip" style={{ background: '#1a1a2e', color: '#AFA9EC', border: '1px solid #2a2a4a', padding: '6px 14px', fontSize: '12px', height: 'auto', lineHeight: 1, fontFamily: 'inherit' }} />
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
      </div>
    </div>
  );
}