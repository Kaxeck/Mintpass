'use client';
import { useState } from "react";
import * as Icons from "lucide-react";
import "../../Home.css";
import { EVENTS } from "../../data/events";
import { CreatedEvent } from "../organizer/CreateEvent";
import { LandingNavBar } from "../../components/LandingNavBar";
import { LandingFooter } from "../../components/LandingFooter";

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
  onGoToOrganizer?: () => void;
  onGoToMyTickets?: () => void;
  onGoToExplore?: () => void;
  onEventClick: (id: number) => void;
}) {
  const [catFilter, setCatFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

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
  
  const filteredEvents = allEvents.filter(e => {
    const matchesCat = catFilter === 'Todos' || e.cat === catFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      e.name.toLowerCase().includes(searchLower) || 
      e.cat.toLowerCase().includes(searchLower);
    
    const matchesLocation = !locationFilter || e.venue.toLowerCase().includes(locationFilter.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter) {
      const parts = dateFilter.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const day = d.getDate();
        const month = d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
        const searchDateStr = `${day} ${month}`.toLowerCase();
        matchesDate = e.date.toLowerCase().includes(searchDateStr) || e.date.toLowerCase().includes('hoy');
      }
    }
    
    return matchesCat && matchesSearch && matchesLocation && matchesDate;
  });

  const handleClearFilters = () => {
    setCatFilter('Todos');
    setSearchQuery('');
    setDateFilter('');
    setLocationFilter('');
  };

  return (
    <div className="lp-container">
      <main className="lp-content">

        <LandingNavBar 
          onGoToExplore={onGoToExplore} 
          onGoToMyTickets={onGoToMyTickets} 
          onGoToOrganizer={onGoToOrganizer} 
        />

        <section className="lp-hero">
          <p className="lp-hero-tag">POWERED BY SOLANA</p>
          <p className="lp-hero-title">Boletos que no se pueden<br />falsificar ni revender de más</p>
          <p className="lp-hero-sub">Compra fácil, sin entender blockchain. Cada boleto es verificable y tuyo.</p>
        </section>

        <section className="lp-features">
          <div className="lp-feature">
            <Icons.QrCode size={28} color="#14F195" />
            <div>
              <p className="lp-feature-title">QR que cambia cada 30s</p>
              <p className="lp-feature-desc">Imposible de duplicar</p>
            </div>
          </div>
          <div className="lp-feature">
            <Icons.ShieldCheck size={28} color="#534AB7" />
            <div>
              <p className="lp-feature-title">Verificado en Solana</p>
              <p className="lp-feature-desc">Estado público, no privado</p>
            </div>
          </div>
          <div className="lp-feature">
            <Icons.TrendingDown size={28} color="#D85A30" />
            <div>
              <p className="lp-feature-title">Reventa con tope</p>
              <p className="lp-feature-desc">Nunca precio inflado</p>
            </div>
          </div>
        </section>

        <section className="lp-search-container">
          <div className="lp-search">
            <input 
              type="text"
              className="lp-search-input" 
              placeholder="Busca tu evento, artista o venue..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent' }}
            />
            <div className="lp-search-filter" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}><Icons.Calendar size={18} color="#A1A1AA" /></span>
              <input 
                type="date" 
                value={dateFilter}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDateFilter(e.target.value)}
                onClick={(e) => {
                  if (e.currentTarget.showPicker) {
                    try { e.currentTarget.showPicker(); } catch (err) {}
                  }
                }}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13px', color: '#5F5E5A', cursor: 'pointer', colorScheme: 'light' }}
              />
            </div>
            <div className="lp-search-filter" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}><Icons.MapPin size={18} color="#4BAA46" /></span>
              <select 
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13px', color: '#5F5E5A', cursor: 'pointer' }}
              >
                <option value="">Todo México</option>
                <option value="CDMX">CDMX</option>
                <option value="León">León, Gto</option>
                <option value="Guadalajara">Guadalajara</option>
                <option value="Monterrey">Monterrey</option>
              </select>
            </div>
            <button type="button" className="lp-search-btn" onClick={() => document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' })} style={{ border: 'none' }}>Buscar</button>
          </div>
        </section>

        <section className="lp-cats-container">
          <div className="lp-cats-header">
            <h2 className="lp-cats-title">Explora por categoría</h2>
            {(catFilter !== 'Todos' || searchQuery || dateFilter || locationFilter) && (
              <button type="button" className="lp-cats-clear" onClick={handleClearFilters} style={{ background: 'transparent', border: 'none', padding: 0 }}>
                Limpiar filtro
              </button>
            )}
          </div>
          <div className="lp-cats-scroll">
            <div className="lp-cat" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1540039155733-d76e6e48e61f?auto=format&fit=crop&w=400&q=80")', backgroundSize: 'cover', backgroundPosition: 'center', color: '#FFF', border: catFilter === 'Música' ? '2px solid #14F195' : 'none' }} onClick={() => setCatFilter(catFilter === 'Música' ? 'Todos' : 'Música')} onDoubleClick={() => setCatFilter('Todos')}>
              <p className="lp-cat-title">Conciertos</p>
            </div>
            <div className="lp-cat" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=80")', backgroundSize: 'cover', backgroundPosition: 'center', color: '#FFF', border: catFilter === 'Arte' ? '2px solid #14F195' : 'none' }} onClick={() => setCatFilter(catFilter === 'Arte' ? 'Todos' : 'Arte')} onDoubleClick={() => setCatFilter('Todos')}>
              <p className="lp-cat-title">Bares y venues</p>
            </div>
            <div className="lp-cat" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=400&q=80")', backgroundSize: 'cover', backgroundPosition: 'center', color: '#FFF', border: catFilter === 'Feria' ? '2px solid #14F195' : 'none' }} onClick={() => setCatFilter(catFilter === 'Feria' ? 'Todos' : 'Feria')} onDoubleClick={() => setCatFilter('Todos')}>
              <p className="lp-cat-title">Cultura y ferias</p>
            </div>
            <div className="lp-cat" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1507676184212-d0330a15233c?auto=format&fit=crop&w=400&q=80")', backgroundSize: 'cover', backgroundPosition: 'center', color: '#FFF', border: catFilter === 'Teatro' ? '2px solid #14F195' : 'none' }} onClick={() => setCatFilter(catFilter === 'Teatro' ? 'Todos' : 'Teatro')} onDoubleClick={() => setCatFilter('Todos')}>
              <p className="lp-cat-title">Escuelas</p>
            </div>
            <div className="lp-cat" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=400&q=80")', backgroundSize: 'cover', backgroundPosition: 'center', color: '#FFF', border: catFilter === 'Deporte' ? '2px solid #14F195' : 'none' }} onClick={() => setCatFilter(catFilter === 'Deporte' ? 'Todos' : 'Deporte')} onDoubleClick={() => setCatFilter('Todos')}>
              <p className="lp-cat-title">Comunidades</p>
            </div>
          </div>
        </section>

        <section className="lp-events-container" id="events-section">
          <div className="lp-events-header">
            <h2 className="lp-events-title">Eventos destacados esta semana</h2>
            <button type="button" className="lp-events-more" onClick={handleClearFilters} style={{ background: 'transparent', border: 'none', padding: 0 }}>
              Ver todos →
            </button>
          </div>
          <div className="lp-events-grid">
            {filteredEvents.map((e, i) => {
              // Asignar imágenes de Unsplash según la categoría
              const catImages: Record<string, string> = {
                'Música': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
                'Arte': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80',
                'Feria': 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=600&q=80',
                'Teatro': 'https://images.unsplash.com/photo-1507676184212-d0330a15233c?auto=format&fit=crop&w=600&q=80',
                'Deporte': 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=600&q=80',
                'Otro': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
              };
              
              const coverImage = catImages[e.cat] || catImages['Otro'];
              // Modificamos ligeramente la URL con el ID para evitar que se repitan exactamente si son de la misma categoría
              const uniqueImage = `${coverImage}&sig=${e.id}`;

              return (
                <div key={e.id} className="lp-event-card" onClick={() => onEventClick(e.id)}>
                  <div className="lp-event-cover" style={{ backgroundImage: `url("${uniqueImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
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
        </section>
        <LandingFooter />
      </main>
    </div>
  );
}

