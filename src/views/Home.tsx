'use client';
import { useState } from "react";
import * as Icons from "lucide-react";
import WalletMultiButton from "../components/WalletButton";
import "../Home.css";
import { EVENTS } from "../data/events";
import { CreatedEvent } from "./CreateEvent";

// Mapeo de categorías del formulario a iconos y colores del catálogo
const catMap: Record<string, { icon: string; color: string; bg: string; cat: string }> = {
  'Música / Concierto': { icon: 'Music', color: '#534AB7', bg: 'rgba(83,74,183,0.15)', cat: 'Música' },
  'Arte y cultura': { icon: 'Palette', color: '#1D9E75', bg: 'rgba(29,158,117,0.15)', cat: 'Arte' },
  'Deporte': { icon: 'Activity', color: '#D85A30', bg: 'rgba(216,90,48,0.15)', cat: 'Deporte' },
  'Feria y mercado': { icon: 'Utensils', color: '#FAC775', bg: 'rgba(250,199,117,0.15)', cat: 'Feria' },
  'Teatro y danza': { icon: 'MicVocal', color: '#E879A8', bg: 'rgba(232,121,168,0.15)', cat: 'Teatro' },
  'Otro': { icon: 'Sparkles', color: '#7F77DD', bg: 'rgba(83,74,183,0.2)', cat: 'Otro' },
};

export default function Home({ 
  createdEvents = [], 
  onGoToOrganizer,
  onGoToMyTickets,
  onGoToExplore,
  onEventClick 
}: { 
  createdEvents?: CreatedEvent[]; 
  onGoToOrganizer: () => void;
  onGoToMyTickets: () => void;
  onGoToExplore?: () => void;
  onEventClick: (id: number) => void;
}) {
  const [catFilter, setCatFilter] = useState('Todos');

  // Convertimos los eventos creados on-chain al mismo formato que los eventos demo
  const onChainAsEvents = createdEvents.map(ev => {
    const style = catMap[ev.category] || catMap['Otro'];
    const dateObj = ev.date ? new Date(ev.date + 'T12:00') : null;
    const dateStr = dateObj
      ? dateObj.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
      : '';
    return {
      id: ev.id,
      icon: style.icon,
      color: style.color,
      bg: style.bg,
      name: ev.name,
      cat: style.cat,
      date: `${dateStr}${ev.time ? ' · ' + ev.time : ''}`,
      venue: ev.venue,
      duration: '',
      price: ev.price,
      total: ev.aforo,
      sold: 0,
      badge: 'new' as string,
      bLabel: 'On-chain',
    };
  });

  // Mezclamos los eventos demo con los creados on-chain
  const allEvents = [...EVENTS, ...onChainAsEvents];
  const filteredEvents = catFilter === 'Todos' ? allEvents : allEvents.filter(e => e.cat === catFilter); return (
    <div className="lp-container">
      <div className="lp-content">

        <div className="lp-nav">
          <span className="lp-nav-brand">
            <img src="/icon.png" alt="Logo" />
            <span>Mint<span style={{ color: '#4BAA46' }}>pass</span></span>
          </span>
          <div className="lp-nav-right">
            <div className="lp-nav-links">
              <span style={{ cursor: 'pointer' }} onClick={() => onGoToExplore ? onGoToExplore() : document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' })}>Explorar</span>
              <span style={{ cursor: 'pointer' }} onClick={onGoToMyTickets}>Mis tickets</span>
              <span style={{ cursor: 'pointer' }} onClick={onGoToOrganizer}>Organizadores</span>
            </div>
            <WalletMultiButton style={{ border: '0.5px solid #D3D1C7', borderRadius: '8px', padding: '6px 14px', color: '#1E1E1E', background: 'transparent', fontSize: '13px', fontFamily: 'inherit', height: 'auto', lineHeight: 1 }} />
          </div>
        </div>

        <div className="lp-hero">
          <p className="lp-hero-tag">POWERED BY SOLANA</p>
          <p className="lp-hero-title">Boletos que no se pueden<br />falsificar ni revender de más</p>
          <p className="lp-hero-sub">Compra fácil, sin entender blockchain. Cada boleto es verificable y tuyo.</p>
        </div>

        <div className="lp-features">
          <div className="lp-feature">
            <p className="lp-feature-title">QR que cambia cada 30s</p>
            <p className="lp-feature-desc">Imposible de duplicar</p>
          </div>
          <div className="lp-feature">
            <p className="lp-feature-title">Verificado en Solana</p>
            <p className="lp-feature-desc">Estado público, no privado</p>
          </div>
          <div className="lp-feature">
            <p className="lp-feature-title">Reventa con tope</p>
            <p className="lp-feature-desc">Nunca precio inflado</p>
          </div>
        </div>

        <div className="lp-search-container">
          <div className="lp-search">
            <div className="lp-search-input">Busca tu evento, artista o venue...</div>
            <div className="lp-search-filter"><span style={{ marginRight: '6px' }}>📅</span>Fecha</div>
            <div className="lp-search-filter"><span style={{ marginRight: '6px' }}>📍</span>León, Gto</div>
            <div className="lp-search-btn">Buscar</div>
          </div>
        </div>

        <div className="lp-cats-container">
          <div className="lp-cats-header">
            <p className="lp-cats-title">Explora por categoría</p>
            {catFilter !== 'Todos' && <span className="lp-cats-clear" onClick={() => setCatFilter('Todos')}>Limpiar filtro</span>}
          </div>
          <div className="lp-cats-scroll">
            <div className="lp-cat" style={{ background: catFilter === 'Música' ? '#D6E8C3' : '#EAF3DE', color: '#173404' }} onClick={() => setCatFilter('Música')}>
              <p className="lp-cat-title">Conciertos</p>
            </div>
            <div className="lp-cat" style={{ background: catFilter === 'Arte' ? '#DBD9FA' : '#EEEDFE', color: '#26215C' }} onClick={() => setCatFilter('Arte')}>
              <p className="lp-cat-title">Bares y venues</p>
            </div>
            <div className="lp-cat" style={{ background: catFilter === 'Feria' ? '#F2D7CD' : '#FAECE7', color: '#4A1B0C' }} onClick={() => setCatFilter('Feria')}>
              <p className="lp-cat-title">Cultura y ferias</p>
            </div>
            <div className="lp-cat" style={{ background: catFilter === 'Teatro' ? '#C2EAE0' : '#E1F5EE', color: '#04342C' }} onClick={() => setCatFilter('Teatro')}>
              <p className="lp-cat-title">Escuelas</p>
            </div>
            <div className="lp-cat" style={{ background: catFilter === 'Deporte' ? '#F4D4DF' : '#FBEAF0', color: '#4B1528' }} onClick={() => setCatFilter('Deporte')}>
              <p className="lp-cat-title">Comunidades</p>
            </div>
          </div>
        </div>

        <div className="lp-events-container" id="events-section">
          <div className="lp-events-header">
            <p className="lp-events-title">Eventos destacados esta semana</p>
            <span className="lp-events-more" onClick={() => setCatFilter('Todos')}>Ver todos →</span>
          </div>
          <div className="lp-events-grid">
            {filteredEvents.map((e, i) => {
              const bgColors = ['#EAF3DE', '#EEEDFE', '#FAECE7', '#E1F5EE', '#FBEAF0'];
              const bgColor = e.bg || bgColors[i % bgColors.length];
              const EventIcon = (Icons as any)[e.icon] || Icons.HelpCircle;

              return (
                <div key={e.id} className="lp-event-card" onClick={() => onEventClick(e.id)}>
                  <div className="lp-event-cover" style={{ background: bgColor }}>
                    <EventIcon size={42} color={e.color || '#1E1E1E'} />
                    {e.badge && (
                      <span className="lp-event-badge">{e.bLabel}</span>
                    )}
                  </div>
                  <div className="lp-event-body">
                    <div>
                      <p className="lp-event-name">{e.name}</p>
                      <p className="lp-event-meta">{e.date} · {e.venue}</p>
                    </div>
                    <div className="lp-event-footer">
                      <p className="lp-event-price">
                        {e.price === 0 ? 'Gratis' : `desde ${e.price} SOL`}
                      </p>
                      <span className="lp-event-cat">{e.cat}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

