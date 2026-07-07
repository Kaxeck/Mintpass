'use client';
import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import WalletButton from "../components/WalletButton";
import { useWalletSession, useSolanaClient } from "@solana/react-hooks";
import { type Address, address as getAddress } from "@solana/kit";
import { getOrganizerReputation } from "../lib/metaplex";
import { readAllEventsFromChain, type OnChainEventData } from "../lib/event-pda";
import CreateEvent, { type CreatedEvent } from "./CreateEvent";
import '../Home.css';

import { usePrivy } from "@privy-io/react-auth";

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
  const [activeSection, setActiveSection] = useState('dashboard');

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
    const priceStr = ev.priceType === 'free' ? 'Gratis' : ev.priceType ? `${ev.price} ${ev.priceType.toUpperCase()}` : (ev.price ? `$${ev.price}` : 'Gratis');

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

  const totalSold = Object.values(eventStats).reduce((acc, curr) => acc + curr.sold, 0);
  const totalAforo = createdEvents.reduce((acc, curr) => acc + (curr.aforo || 0), 0);
  const remainingAforo = totalAforo - totalSold;
  const totalRevenue = createdEvents.reduce((acc, ev) => {
    const sold = eventStats[ev.id]?.sold || 0;
    const price = ev.priceType === 'free' ? 0 : ev.price || 0;
    return acc + (sold * price);
  }, 0);

  const upcomingEvent = createdEvents.length > 0 ? createdEvents[0] : null;
  const headerName = upcomingEvent ? upcomingEvent.name : "Bienvenido a tu Dashboard";
  const headerDate = upcomingEvent 
    ? (upcomingEvent.date ? new Date(upcomingEvent.date + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + (upcomingEvent.venue ? ' · ' + upcomingEvent.venue : '') : '') 
    : "Resumen general de actividad";

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
            <WalletButton style={{ width: '100%', border: '0.5px solid #3A3A38', borderRadius: '12px', padding: '10px', color: '#FFF', background: 'transparent', fontSize: '13px', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', height: '100vh' }}>
          
          {activeSection === 'dashboard' ? (
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

          <div style={{ background: '#F7F8F7', borderRadius: '16px', padding: '20px 24px', marginBottom: '32px' }}>
            <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Ventas últimos 7 días</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '100px' }}>
              <div style={{ flex: 1, background: '#97C459', height: '35%', borderRadius: '4px 4px 0 0' }}></div>
              <div style={{ flex: 1, background: '#97C459', height: '55%', borderRadius: '4px 4px 0 0' }}></div>
              <div style={{ flex: 1, background: '#97C459', height: '40%', borderRadius: '4px 4px 0 0' }}></div>
              <div style={{ flex: 1, background: '#639922', height: '75%', borderRadius: '4px 4px 0 0' }}></div>
              <div style={{ flex: 1, background: '#97C459', height: '60%', borderRadius: '4px 4px 0 0' }}></div>
              <div style={{ flex: 1, background: '#97C459', height: '90%', borderRadius: '4px 4px 0 0' }}></div>
              <div style={{ flex: 1, background: '#3B6D11', height: '100%', borderRadius: '4px 4px 0 0' }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 500px' }}>
              <div className="section-header" style={{ marginBottom: '20px' }}>
                <div className="tab-bar" style={{ border: 'none', margin: 0 }}>
                  <div className={`ttab ${activeTab === 'activos' ? 'on' : ''}`} onClick={() => setActiveTab('activos')}>Activos</div>
                  <div className={`ttab ${activeTab === 'proximos' ? 'on' : ''}`} onClick={() => setActiveTab('proximos')}>Próximos</div>
                  <div className={`ttab ${activeTab === 'pasados' ? 'on' : ''}`} onClick={() => setActiveTab('pasados')}>Pasados</div>
                </div>
              </div>
              
              <div className="event-list" id="event-list">
                {loadingEvents && (
                  <div style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: '#AFA9EC' }}>
                    ⛓️ Consultando eventos en la blockchain de Solana...
                  </div>
                )}

                {createdEvents.length === 0 ? (
                  <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px', background: '#F7F8F7', borderRadius: '16px', border: 'none' }}>
                    <Icons.PlusCircle size={40} color="#14F195" style={{ marginBottom: '16px' }} />
                    <div style={{ fontSize: '16px', marginBottom: '8px', fontWeight: 500, color: '#1E1E1E' }}>Aún no has creado ningún evento</div>
                    <div style={{ fontSize: '14px', color: '#5F5E5A' }}>Presiona "Crear evento" para lanzar tu primera colección NFT en Solana</div>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="empty-state" style={{ background: '#F7F8F7', borderRadius: '16px', border: 'none', color: '#5F5E5A' }}>No hay eventos en esta categoría.</div>
                ) : (
                  filteredEvents.map(ev => {
                    const EventIcon = (Icons as Record<string, unknown>)[ev.coverText] as typeof Icons.HelpCircle || Icons.HelpCircle;
                    const isVerifiedOnChain = onChainEvents.some(oc => oc.collectionMint === ev.collectionMint);
                    return (
                      <div className="event-card" key={ev.id} onClick={() => onEventClick(ev.id)} style={{ background: '#F7F8F7', border: 'none' }}>
                        <div className={`event-cover ${ev.coverClass}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <EventIcon size={24} color="#fff" />
                        </div>

                        <div className="event-info">
                          <div className="event-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E1E1E' }}>
                            {ev.name}
                            {isVerifiedOnChain && (
                              <span title="Evento verificado en blockchain" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', background: 'rgba(75,170,70,0.15)', color: '#3B6D11', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                <Icons.ShieldCheck size={12} /> On-chain
                              </span>
                            )}
                          </div>
                          <div className="event-meta" style={{ color: '#5F5E5A' }}>{ev.meta}</div>

                          <div className="event-bar-wrap" style={{ background: '#E5E5E5' }}>
                            <div className="event-bar" style={{ width: `${ev.progress}%`, background: '#1E1E1E' }}></div>
                          </div>
                          <div className="event-bar-label" style={{ color: '#5F5E5A' }}>{ev.progressLabel}</div>

                          <div className="event-actions">
                            {ev.actions.map((action, idx) => (
                              <button
                                key={idx}
                                className="btn-sm"
                                style={{ background: idx === ev.primaryAction ? '#1E1E1E' : '#FFFFFF', color: idx === ev.primaryAction ? '#FFFFFF' : '#1E1E1E', border: idx === ev.primaryAction ? 'none' : '0.5px solid #D3D1C7' }}
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
            
            <div style={{ flex: '1 1 300px' }}>
               <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Actividad reciente</p>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#F7F8F7', borderRadius: '16px', padding: '20px' }}>
                 <div style={{ fontSize: '13px', color: '#1E1E1E', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: 1.4 }}>
                   <Icons.CircleUser size={16} color="#4BAA46" style={{ marginTop: '2px', flexShrink: 0 }} /> 
                   <span><strong>12 boletos vendidos</strong> en la última hora para el Festival Sonora Norte</span>
                 </div>
                 <div style={{ fontSize: '13px', color: '#1E1E1E', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: 1.4 }}>
                   <Icons.ShieldAlert size={16} color="#D85A30" style={{ marginTop: '2px', flexShrink: 0 }} /> 
                   <span><strong>2 intentos de reventa</strong> fuera de reglas bloqueados por contrato inteligente</span>
                 </div>
                 <div style={{ fontSize: '13px', color: '#1E1E1E', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: 1.4 }}>
                   <Icons.Star size={16} color="#EF9F27" style={{ marginTop: '2px', flexShrink: 0 }} /> 
                   <span><strong>34 asistentes recurrentes</strong> elegibles para recompensas automáticas</span>
                 </div>
               </div>
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
                <button onClick={() => setActiveSection('crear_evento')} style={{ background: '#1E1E1E', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
                  <Icons.Plus size={18} strokeWidth={2.5} /> Crear evento
                </button>
              </div>

              <div className="section-header" style={{ marginBottom: '20px' }}>
                <div className="tab-bar" style={{ border: 'none', margin: 0 }}>
                  <div className={`ttab ${activeTab === 'activos' ? 'on' : ''}`} onClick={() => setActiveTab('activos')}>Activos</div>
                  <div className={`ttab ${activeTab === 'proximos' ? 'on' : ''}`} onClick={() => setActiveTab('proximos')}>Próximos</div>
                  <div className={`ttab ${activeTab === 'pasados' ? 'on' : ''}`} onClick={() => setActiveTab('pasados')}>Pasados</div>
                </div>
              </div>
              
              <div className="event-list" id="event-list">
                {loadingEvents && (
                  <div style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: '#AFA9EC' }}>
                    ⛓️ Consultando eventos en la blockchain de Solana...
                  </div>
                )}

                {createdEvents.length === 0 ? (
                  <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px', background: '#F7F8F7', borderRadius: '16px', border: 'none' }}>
                    <Icons.PlusCircle size={40} color="#14F195" style={{ marginBottom: '16px' }} />
                    <div style={{ fontSize: '16px', marginBottom: '8px', fontWeight: 500, color: '#1E1E1E' }}>Aún no has creado ningún evento</div>
                    <div style={{ fontSize: '14px', color: '#5F5E5A' }}>Presiona "Crear evento" para lanzar tu primera colección NFT en Solana</div>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="empty-state" style={{ background: '#F7F8F7', borderRadius: '16px', border: 'none', color: '#5F5E5A' }}>No hay eventos en esta categoría.</div>
                ) : (
                  filteredEvents.map(ev => {
                    const EventIcon = (Icons as Record<string, unknown>)[ev.coverText] as typeof Icons.HelpCircle || Icons.HelpCircle;
                    const isVerifiedOnChain = onChainEvents.some(oc => oc.collectionMint === ev.collectionMint);
                    return (
                      <div className="event-card" key={ev.id} onClick={() => onEventClick(ev.id)} style={{ background: '#F7F8F7', border: 'none' }}>
                        <div className={`event-cover ${ev.coverClass}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <EventIcon size={24} color="#fff" />
                        </div>

                        <div className="event-info">
                          <div className="event-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E1E1E' }}>
                            {ev.name}
                            {isVerifiedOnChain && (
                              <span title="Evento verificado en blockchain" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', background: 'rgba(75,170,70,0.15)', color: '#3B6D11', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                <Icons.ShieldCheck size={12} /> On-chain
                              </span>
                            )}
                          </div>
                          <div className="event-meta" style={{ color: '#5F5E5A' }}>{ev.meta}</div>

                          <div className="event-bar-wrap" style={{ background: '#E5E5E5' }}>
                            <div className="event-bar" style={{ width: `${ev.progress}%`, background: '#1E1E1E' }}></div>
                          </div>
                          <div className="event-bar-label" style={{ color: '#5F5E5A' }}>{ev.progressLabel}</div>

                          <div className="event-actions">
                            {ev.actions.map((action, idx) => (
                              <button
                                key={idx}
                                className="btn-sm"
                                style={{ background: idx === ev.primaryAction ? '#1E1E1E' : '#FFFFFF', color: idx === ev.primaryAction ? '#FFFFFF' : '#1E1E1E', border: idx === ev.primaryAction ? 'none' : '0.5px solid #D3D1C7' }}
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
            </>
          ) : activeSection === 'crear_evento' ? (
            <div style={{ margin: '-32px -40px', height: 'calc(100vh - 64px)', overflow: 'auto' }}>
              <CreateEvent onBack={() => setActiveSection('eventos')} onSuccess={(ev) => { setActiveSection('eventos'); window.location.reload(); }} />
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