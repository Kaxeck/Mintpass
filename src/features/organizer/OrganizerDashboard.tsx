'use client';
import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import WalletButton from "../../components/ui/WalletButton";
import { useWalletSession, useSolanaClient } from "@solana/react-hooks";
import { type Address, address as getAddress } from "@solana/kit";
import { getOrganizerReputation } from "../../lib/metaplex";
import { readAllEventsFromChain, type OnChainEventData } from "../../lib/event-pda";
import CreateEvent, { type CreatedEvent } from "./CreateEvent";
import CheckInStaff from "./CheckInStaff";
import OrganizerProfileSetup, { type OrganizerProfile } from "./OrganizerProfileSetup";
import EventDetails from "./EventDetails";
import { updateOrganizerProfileInDb } from "../../app/actions/organizer";
import '../../styles/dashboard.css';
import '../../styles/layout.css';
import './OrganizerDashboard.css';
import { useMintpassStore } from "../../store";

import { usePrivy } from "@privy-io/react-auth";

export default function OrganizerDashboard({
  createdEvents,
  eventStats = {},
  onBack,
  onCreate,
  onEventClick,
  onGoToMyTickets,
  onGoToExplore,
  organizerProfile,
  onProfileComplete
}: {
  createdEvents: CreatedEvent[];
  eventStats?: Record<string, { sold: number; checked: number }>;
  onBack: () => void;
  onCreate: () => void;
  onEventClick: (id: string | number) => void;
  onGoToMyTickets?: () => void;
  onGoToExplore?: () => void;
  organizerProfile?: OrganizerProfile | null;
  onProfileComplete?: (profile: OrganizerProfile) => void;
}) {
  const { authenticated, user, ready } = usePrivy();
  const { setCreatedEvents } = useMintpassStore();
  const session = useWalletSession();
  const client = useSolanaClient();
  const rpcRaw = client?.runtime?.rpc;
  const [activeTab, setActiveTab] = useState('activos');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | number | null>(null);

  const SIDEBAR_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.LayoutDashboard },
    { id: 'eventos', label: 'Mis eventos', icon: Icons.CalendarDays },
    { id: 'ventas', label: 'Ventas y pagos', icon: Icons.CircleDollarSign },
    { id: 'checkin', label: 'Check-in / staff', icon: Icons.Users },
    { id: 'reportes', label: 'Reportes', icon: Icons.BarChart2 },
    { id: 'reputacion', label: 'Reputación', icon: Icons.Award },
    { id: 'config', label: 'Configuración', icon: Icons.Settings },
  ];

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
  const privySolanaWallet = (user?.linkedAccounts?.find(
    (account: any) => account.type === 'wallet' && account.chainType === 'solana'
  ) as any)?.address;
  const walletAddressStr = privySolanaWallet || session?.account?.address?.toString() || null;
  let walletAddress: Address | null = null;
  if (walletAddressStr) {
    try {
      walletAddress = getAddress(walletAddressStr);
    } catch (e) {
      console.warn("No es una dirección de Solana válida (quizá es EVM):", walletAddressStr);
    }
  }
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
      const knownMints = createdEvents.map((ev: any) => ev.collectionMint).filter((m: any) => m && m.length >= 32 && m.length <= 44 && !m.startsWith('mock'));
      if (knownMints.length === 0) {
        setLoadingEvents(false);
        return;
      }

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
    'Música / Concierto': 'od-thumb-purple', 'Arte y cultura': 'od-thumb-teal', 'Deporte': 'od-thumb-coral',
    'Feria y mercado': 'od-thumb-purple', 'Teatro y danza': 'od-thumb-teal', 'Otro': 'od-thumb-coral'
  };
  const categoryProgressColors: Record<string, string> = {
    'Música / Concierto': '#534AB7', 'Arte y cultura': '#1D9E75', 'Deporte': '#D85A30',
    'Feria y mercado': '#EF9F27', 'Teatro y danza': '#E879A8', 'Otro': '#534AB7'
  };

  const events = createdEvents.map((ev: any) => {
    const rawDate = ev.date ? new Date(ev.date + 'T12:00') : null;
    const eventDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate : null;
    const isToday = eventDate && eventDate.toDateString() === new Date().toDateString();
    const isPast = eventDate && eventDate < new Date();
    
    // Asignar categoría (pestaña)
    let cat = isToday ? 'activos' : isPast ? 'pasados' : 'proximos';
    if (ev.status === 'CANCELLED') {
      cat = 'cancelados';
    }

    const dateStr = eventDate ? eventDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) : (ev.date || '');
    const metaStr = `${dateStr}${ev.time ? ' · ' + ev.time + ' h' : ''} · ${ev.venue}`;
    const priceStr = ev.priceType === 'free' ? 'Gratis' : ev.priceType ? `${ev.price} ${ev.priceType.toUpperCase()}` : (ev.price ? (ev.hasMultipleZones ? `Desde ${ev.price} SOL` : `${ev.price} SOL`) : 'Gratis');

    const sold = eventStats[ev.id.toString()]?.sold || 0;
    const progress = Math.round((sold / (ev.aforo || 1)) * 100);

    let statusText = isToday ? 'En curso' : isPast ? 'Terminado' : 'Próximo';
    let statusClass = isToday ? 'od-pill-active' : isPast ? 'od-pill-past' : 'od-pill-soon';
    
    if (ev.status === 'CANCELLED') {
      statusText = 'Cancelado';
      statusClass = 'od-pill-cancelled';
    }

    return {
      id: ev.id, cat, name: ev.name, meta: metaStr,
      coverImage: ev.coverImage,
      coverText: categoryIcons[ev.category] || 'Sparkles',
      coverClass: categoryColors[ev.category] || 'od-thumb-purple',
      progress,
      progressColor: categoryProgressColors[ev.category] || '#534AB7',
      progressLabel: `${sold} / ${ev.aforo} entradas vendidas`,
      statusClass,
      statusText,
      price: priceStr,
      actions: ev.status === 'CANCELLED' ? ['Ver detalles'] : ['Panel staff', 'Ver QR Blink', 'Compartir'],
      primaryAction: ev.status === 'CANCELLED' ? -1 : 0,
      collectionMint: ev.collectionMint
    };
  });

  useEffect(() => {
    if (events.length > 0) {
      const hasActive = events.some(e => e.cat === 'activos');
      const hasProximos = events.some(e => e.cat === 'proximos');
      if (!hasActive && hasProximos && activeTab === 'activos') {
        setActiveTab('proximos');
      }
    }
  }, [events.length]);

  const filteredEvents = events.filter(e => e.cat === activeTab);

  const getReputationLevel = (score: number) => {
    if (score >= 50) return { label: 'Excelente', color: '#5DCAA5', icon: '⭐' };
    if (score >= 20) return { label: 'Buena', color: '#EF9F27', icon: '👍' };
    if (score > 0) return { label: 'Nueva', color: '#AFA9EC', icon: '🆕' };
    return { label: 'Sin historial', color: '#666', icon: '—' };
  };

  // Filtrar eventos que no están cancelados ni pasados para las estadísticas de aforo activo
  const activeStatsEvents = createdEvents.filter(ev => {
    if (ev.status === 'CANCELLED') return false;
    const rawDate = ev.date ? new Date(ev.date + 'T12:00') : null;
    const eventDate = rawDate && !isNaN(rawDate.getTime()) ? rawDate : null;
    const isPast = eventDate && eventDate < new Date();
    // Considerar como activo si no ha pasado o si es hoy
    const isToday = eventDate && eventDate.toDateString() === new Date().toDateString();
    return !isPast || isToday;
  });

  const totalSold = activeStatsEvents.reduce((acc, ev) => acc + (eventStats[ev.id.toString()]?.sold || 0), 0);
  const totalAforo = activeStatsEvents.reduce((acc, ev) => acc + (ev.aforo || 0), 0);
  const remainingAforo = totalAforo - totalSold;
  const totalRevenue = createdEvents.reduce((acc, ev) => {
    const sold = eventStats[ev.id.toString()]?.sold || 0;
    const price = ev.priceType === 'free' ? 0 : ev.price || 0;
    return acc + (sold * price);
  }, 0);

  const upcomingEvent = createdEvents.length > 0 ? createdEvents[0] : null;
  const headerName = "Dashboard General";
  const headerDate = organizerProfile?.name ? `¡Hola de nuevo, ${organizerProfile.name}!` : "Resumen general de actividad";

  return (
    <div style={{ background: '#FFFFFF', height: '100vh', width: '100vw', display: 'flex', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
        
        {/* Sidebar */}
        <div style={{ width: '220px', background: '#1E1E1E', padding: '24px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0, height: '100vh', overflowY: 'auto' }}>
          <div>
            <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/icon.png" alt="Logo" style={{ height: '22px' }} />
                <span>Mint<span style={{ color: '#14F195' }}>pass</span></span>
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {SIDEBAR_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <div key={item.id} onClick={() => setActiveSection(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderLeft: isActive ? '3px solid #14F195' : '3px solid transparent', background: isActive ? '#2C2C2A' : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}>
                    <Icon size={18} color={isActive ? "#14F195" : "#5F5E5A"} />
                    <span style={{ fontSize: '14px', color: isActive ? '#FFFFFF' : '#B4B2A9', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderLeft: '3px solid transparent', cursor: 'pointer', transition: 'background 0.2s' }} onClick={onBack}>
                <Icons.Globe size={18} color="#5F5E5A" />
                <span style={{ fontSize: '14px', color: '#B4B2A9', fontWeight: 500 }}>Explorar Mintpass</span>
              </div>
            </div>
          </div>
          <div style={{ padding: '24px 24px 0', borderTop: '0.5px solid #3A3A38' }}>
            <WalletButton dropdownPosition="top" style={{ width: '100%', border: '0.5px solid #3A3A38', borderRadius: '12px', padding: '10px', color: '#FFF', background: 'transparent', fontSize: '13px', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: selectedEventId ? 0 : '32px 40px', overflowY: 'auto', height: '100vh', background: '#F7F8F7' }}>
          
          {selectedEventId ? (
            <EventDetails 
              event={createdEvents.find(e => e.id.toString() === selectedEventId.toString())!} 
              stats={eventStats[selectedEventId.toString()]} 
              onBack={() => setSelectedEventId(null)} 
              onGoToStaff={() => { setSelectedEventId(null); setActiveSection('checkin'); }} 
            />
          ) : !organizerProfile ? (
            <div style={{ margin: '-32px -40px', height: 'calc(100vh)', overflow: 'auto' }}>
              <OrganizerProfileSetup onComplete={async (profile) => {
                if (!walletAddressStr) {
                  alert("Aún no se ha detectado tu wallet de Solana. Si iniciaste con correo, espera unos segundos a que se asigne, o conecta una wallet directamente (ej. Phantom).");
                  return;
                }
                const res = await updateOrganizerProfileInDb(walletAddressStr, profile);
                if (!res.success) {
                  alert("Error al guardar el perfil: " + res.error);
                  return;
                }
                onProfileComplete?.(profile);
              }} />
            </div>
          ) : activeSection === 'dashboard' ? (
            <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#1E1E1E' }}>{headerName}</p>
              <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#5F5E5A' }}>{headerDate}</p>
            </div>
            <button onClick={() => setActiveSection('crear_evento')} style={{ background: '#14F195', color: '#1E1E1E', fontSize: '14px', fontWeight: 600, padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(20, 241, 149, 0.2)' }}>
              <Icons.Plus size={18} strokeWidth={2.5} /> Crear evento
            </button>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', background: '#F7F8F7', borderRadius: '16px', padding: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#5F5E5A', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}><Icons.Ticket size={16} color="#A1A1AA" /> Vendidos</p>
              <p style={{ margin: '12px 0 0', fontSize: '28px', fontWeight: 600, color: '#1E1E1E' }}>{totalSold}</p>
            </div>
            <div style={{ flex: '1 1 200px', background: '#F7F8F7', borderRadius: '16px', padding: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#5F5E5A', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}><Icons.CircleDollarSign size={16} color="#A1A1AA" /> Ingresos</p>
              <p style={{ margin: '12px 0 0', fontSize: '28px', fontWeight: 600, color: '#1E1E1E' }}>${totalRevenue.toLocaleString()}</p>
            </div>
            <div style={{ flex: '1 1 200px', background: '#F7F8F7', borderRadius: '16px', padding: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#5F5E5A', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}><Icons.Users size={16} color="#A1A1AA" /> Aforo restante</p>
              <p style={{ margin: '12px 0 0', fontSize: '28px', fontWeight: 600, color: '#1E1E1E' }}>{remainingAforo}</p>
            </div>
            <div style={{ flex: '1 1 200px', background: '#EAF3DE', borderRadius: '16px', padding: '20px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#27500A', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}><Icons.Award size={16} color="#4BAA46" /> Reputación</p>
              <div style={{ margin: '12px 0 0', fontSize: '28px', fontWeight: 600, color: '#173404', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reputationScore !== null ? reputationScore : '—'}
                {reputationScore !== null && <span style={{ fontSize: '14px', fontWeight: 500, color: getReputationLevel(reputationScore).color }}>{getReputationLevel(reputationScore).label}</span>}
              </div>
            </div>
          </div>

          {/* Gráfica de Ventas Últimos 7 Días */}
          <div className="od-panel-card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p className="od-panel-title">
                <Icons.TrendingUp size={18} color="#4BAA46" /> Ventas últimos 7 días
              </p>
              <span style={{ fontSize: '13px', color: '#5F5E5A', fontWeight: 600 }}>Total: ${totalRevenue.toLocaleString()} SOL</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '110px', padding: '10px 0 0' }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const dayName = d.toLocaleDateString('es-MX', { weekday: 'short' });
                const heightPct = totalSold > 0 ? Math.max(15, Math.min(100, Math.round((totalSold * (i + 1) * 15)))) : 6;
                const barColor = totalSold > 0 ? (i === 6 ? '#14F195' : '#4BAA46') : '#E4E4E7';
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%' }}>
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', background: barColor, height: `${heightPct}%`, borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#5F5E5A', textTransform: 'capitalize' }}>{dayName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel Principal: Mis Eventos */}
          <div className="od-panel-card" style={{ marginBottom: '32px' }}>
            <div className="od-panel-header">
              <p className="od-panel-title">
                <Icons.CalendarDays size={18} color="#4BAA46" /> Mis Eventos
              </p>
              <div className="od-tab-bar">
                <div className={`od-ttab ${activeTab === 'activos' ? 'on' : ''}`} onClick={() => setActiveTab('activos')}>Activos</div>
                <div className={`od-ttab ${activeTab === 'proximos' ? 'on' : ''}`} onClick={() => setActiveTab('proximos')}>Próximos</div>
                <div className={`od-ttab ${activeTab === 'pasados' ? 'on' : ''}`} onClick={() => setActiveTab('pasados')}>Pasados</div>
                <div className={`od-ttab ${activeTab === 'cancelados' ? 'on' : ''}`} onClick={() => setActiveTab('cancelados')}>Cancelados</div>
              </div>
            </div>
            
            <div className="od-event-list" id="event-list">
              {loadingEvents && (
                <div style={{ textAlign: 'center', padding: '12px', fontSize: '13px', color: '#5F5E5A' }}>
                  Sincronizando la información de tus eventos...
                </div>
              )}

              {createdEvents.length === 0 ? (
                <div className="od-empty">
                  <Icons.PlusCircle size={40} color="#4BAA46" style={{ marginBottom: '16px' }} />
                  <p className="od-empty-title">Aún no has creado ningún evento</p>
                  <p className="od-empty-sub">Presiona &quot;Crear evento&quot; para publicar tu primer evento de forma rápida y segura.</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="od-empty">
                  <p className="od-empty-sub">No hay eventos registrados en esta pestaña ({activeTab}).</p>
                </div>
              ) : (
                filteredEvents.map((ev: any) => {
                  const EventIcon = (Icons as Record<string, unknown>)[ev.coverText] as typeof Icons.HelpCircle || Icons.HelpCircle;
                  const isVerifiedOnChain = onChainEvents.some(oc => oc.collectionMint === ev.collectionMint);
                  return (
                    <div className="od-event-card" key={ev.id} onClick={() => setSelectedEventId(ev.id)}>
                      <div className="od-event-thumb" style={ev.coverImage ? { backgroundImage: `url('${ev.coverImage}')` } : undefined}>
                        {!ev.coverImage && (
                          <div className={`od-event-thumb-icon ${ev.coverClass}`}>
                            <EventIcon size={20} />
                          </div>
                        )}
                      </div>

                      <div className="od-event-body">
                        <p className="od-event-name">
                          {ev.name}
                          {isVerifiedOnChain && (
                            <span className="od-onchain">
                              <Icons.ShieldCheck size={11} /> Verificado
                            </span>
                          )}
                        </p>
                        <p className="od-event-meta">{ev.meta}</p>
                        <div className="od-bar-wrap">
                          <div className="od-bar" style={{ width: `${ev.progress}%`, background: ev.progressColor }} />
                        </div>
                        <p className="od-bar-label">{ev.progressLabel}</p>
                        <div className="od-event-actions">
                          {ev.actions.map((action: any, idx: number) => (
                            <button
                              key={idx}
                              className={`od-btn ${idx === ev.primaryAction ? 'od-btn-primary' : ''}`}
                              onClick={(e) => { e.stopPropagation(); if (action === 'Panel staff') { setActiveSection('checkin'); } else { alert(`Acción: ${action}`); } }}
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="od-event-right">
                        <span className={`od-pill ${ev.statusClass}`}>{ev.statusText}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Actividad Reciente a todo lo ancho (Full Width) */}
          <div className="od-panel-card" style={{ width: '100%', marginBottom: '32px' }}>
             <div className="od-panel-header">
               <p className="od-panel-title">
                 <Icons.Activity size={18} color="#534AB7" /> Actividad Reciente
               </p>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
               {createdEvents.length === 0 ? (
                 <div style={{ fontSize: '13px', color: '#5F5E5A', textAlign: 'center', padding: '16px 0', gridColumn: '1 / -1' }}>
                   No hay actividad reciente registrada.
                 </div>
               ) : (
                 <>
                   <div style={{ background: '#F8F9F8', borderRadius: '12px', padding: '16px', border: '1px solid #E8E6E0', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                     <Icons.CircleCheck size={20} color="#4BAA46" style={{ marginTop: '2px', flexShrink: 0 }} /> 
                     <div>
                       <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1E1E1E' }}>Eventos Activos</p>
                       <p style={{ margin: 0, fontSize: '13px', color: '#5F5E5A', lineHeight: 1.4 }}><strong>{createdEvents.length} evento(s)</strong> publicado(s) y listo(s) para venta.</p>
                     </div>
                   </div>
                   <div style={{ background: '#F8F9F8', borderRadius: '12px', padding: '16px', border: '1px solid #E8E6E0', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                     <Icons.Ticket size={20} color="#1D9E75" style={{ marginTop: '2px', flexShrink: 0 }} /> 
                     <div>
                       <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1E1E1E' }}>Entradas Emitidas</p>
                       <p style={{ margin: 0, fontSize: '13px', color: '#5F5E5A', lineHeight: 1.4 }}><strong>{totalSold} entrada(s)</strong> generada(s) hasta el momento.</p>
                     </div>
                   </div>
                   <div style={{ background: '#F8F9F8', borderRadius: '12px', padding: '16px', border: '1px solid #E8E6E0', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                     <Icons.ShieldCheck size={20} color="#534AB7" style={{ marginTop: '2px', flexShrink: 0 }} /> 
                     <div>
                       <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1E1E1E' }}>Seguridad de Pagos</p>
                       <p style={{ margin: 0, fontSize: '13px', color: '#5F5E5A', lineHeight: 1.4 }}>Bóveda de ingresos activa y protegida para tu tranquilidad.</p>
                     </div>
                   </div>
                 </>
               )}
             </div>
          </div>
          </>
          ) : activeSection === 'eventos' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#1E1E1E' }}>Mis eventos</p>
                  <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#5F5E5A' }}>Gestiona y administra todos tus eventos creados</p>
                </div>
                <button onClick={() => setActiveSection('crear_evento')} style={{ background: '#14F195', color: '#1E1E1E', fontSize: '14px', fontWeight: 600, padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(20, 241, 149, 0.2)' }}>
                  <Icons.Plus size={18} strokeWidth={2.5} /> Crear evento
                </button>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="od-tab-bar">
                  <div className={`od-ttab ${activeTab === 'activos' ? 'on' : ''}`} onClick={() => setActiveTab('activos')}>Activos</div>
                  <div className={`od-ttab ${activeTab === 'proximos' ? 'on' : ''}`} onClick={() => setActiveTab('proximos')}>Próximos</div>
                  <div className={`od-ttab ${activeTab === 'pasados' ? 'on' : ''}`} onClick={() => setActiveTab('pasados')}>Pasados</div>
                  <div className={`od-ttab ${activeTab === 'cancelados' ? 'on' : ''}`} onClick={() => setActiveTab('cancelados')}>Cancelados</div>
                </div>
              </div>
              
              <div className="od-event-list" id="event-list">
                {loadingEvents && (
                  <div style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: '#5F5E5A' }}>
                    ⛓️ Consultando eventos en la blockchain de Solana...
                  </div>
                )}

                {createdEvents.length === 0 ? (
                  <div className="od-empty">
                    <Icons.PlusCircle size={40} color="#4BAA46" style={{ marginBottom: '16px' }} />
                    <p className="od-empty-title">Aún no has creado ningún evento</p>
                    <p className="od-empty-sub">Presiona &quot;Crear evento&quot; para lanzar tu primera colección NFT en Solana</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="od-empty">
                    <p className="od-empty-sub">No hay eventos en esta categoría.</p>
                  </div>
                ) : (
                  filteredEvents.map((ev: any) => {
                    const EventIcon = (Icons as Record<string, unknown>)[ev.coverText] as typeof Icons.HelpCircle || Icons.HelpCircle;
                    const isVerifiedOnChain = onChainEvents.some(oc => oc.collectionMint === ev.collectionMint);
                    return (
                      <div className="od-event-card" key={ev.id} onClick={() => setSelectedEventId(ev.id)}>
                        <div className="od-event-thumb" style={ev.coverImage ? { backgroundImage: `url('${ev.coverImage}')` } : undefined}>
                          {!ev.coverImage && (
                            <div className={`od-event-thumb-icon ${ev.coverClass}`}>
                              <EventIcon size={20} />
                            </div>
                          )}
                        </div>

                        <div className="od-event-body">
                          <p className="od-event-name">
                            {ev.name}
                            {isVerifiedOnChain && (
                              <span className="od-onchain">
                                <Icons.ShieldCheck size={11} /> On-chain
                              </span>
                            )}
                          </p>
                          <p className="od-event-meta">{ev.meta}</p>
                          <div className="od-bar-wrap">
                            <div className="od-bar" style={{ width: `${ev.progress}%`, background: ev.progressColor }} />
                          </div>
                          <p className="od-bar-label">{ev.progressLabel}</p>
                          <div className="od-event-actions">
                            {ev.actions.map((action: any, idx: number) => (
                              <button
                                key={idx}
                                className={`od-btn ${idx === ev.primaryAction ? 'od-btn-primary' : ''}`}
                                onClick={(e) => { e.stopPropagation(); if (action === 'Panel staff') { setActiveSection('checkin'); } else { alert(`Acción: ${action}`); } }}
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="od-event-right">
                          <span className={`od-pill ${ev.statusClass}`}>{ev.statusText}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : activeSection === 'crear_evento' ? (
            <div style={{ margin: '-32px -40px', height: 'calc(100vh - 64px)', overflow: 'auto' }}>
              <CreateEvent onBack={() => setActiveSection('eventos')} onSuccess={(ev) => { setCreatedEvents(prev => [ev, ...prev]); setActiveSection('eventos'); }} />
            </div>
          ) : activeSection === 'checkin' ? (
            <div style={{ margin: '-32px -40px', height: 'calc(100vh - 64px)', overflow: 'auto', background: '#F7F8F7' }}>
              <CheckInStaff 
                events={createdEvents} 
                onGoToScanner={(token) => window.open(`/staff-scanner/${token}`, '_blank')} 
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#A1A1AA' }}>
              <Icons.Hammer size={48} color="#D3D1C7" style={{ marginBottom: '16px' }} />
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1E1E1E', marginBottom: '8px' }}>Próximamente</h2>
              <p style={{ fontSize: '15px' }}>Esta sección estará disponible en futuras actualizaciones.</p>
            </div>
          )}

        </div>
    </div>
  );
}
