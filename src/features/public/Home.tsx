'use client';
import { useState, useMemo } from "react";
import { QrCode, ShieldCheck, TrendingDown, Search, Calendar, MapPin, SearchX } from "lucide-react";
import "../../styles/Home.css";
import { Country, State, City } from 'country-state-city';
import { CreatedEvent } from "../organizer/CreateEvent";
import { LandingNavBar } from "../../components/layout/LandingNavBar";
import { LandingFooter } from "../../components/layout/LandingFooter";

// Mapeo de categorías del formulario a iconos y colores del catálogo
const catMap: Record<string, { icon: string; color: string; bg: string; cat: string }> = {
  'Música / Concierto': { icon: 'Music', color: '#534AB7', bg: 'rgba(83,74,183,0.15)', cat: 'Música' },
  'Conciertos': { icon: 'Music', color: '#534AB7', bg: 'rgba(83,74,183,0.15)', cat: 'Música' },
  'Festivales': { icon: 'Music', color: '#534AB7', bg: 'rgba(83,74,183,0.15)', cat: 'Música' },
  'Arte y cultura': { icon: 'Palette', color: '#1D9E75', bg: 'rgba(29,158,117,0.15)', cat: 'Arte' },
  'Arte y Exposiciones': { icon: 'Palette', color: '#1D9E75', bg: 'rgba(29,158,117,0.15)', cat: 'Arte' },
  'Cultura': { icon: 'Library', color: '#534AB7', bg: 'rgba(83,74,183,0.15)', cat: 'Cultura' },
  'Deporte': { icon: 'Activity', color: '#D85A30', bg: 'rgba(216,90,48,0.15)', cat: 'Deporte' },
  'Deportes': { icon: 'Activity', color: '#D85A30', bg: 'rgba(216,90,48,0.15)', cat: 'Deportes' },
  'Feria y mercado': { icon: 'Utensils', color: '#FAC775', bg: 'rgba(250,199,117,0.15)', cat: 'Feria' },
  'Bares y venues': { icon: 'GlassWater', color: '#1D9E75', bg: 'rgba(29,158,117,0.15)', cat: 'Bares' },
  'Teatro y danza': { icon: 'MicVocal', color: '#E879A8', bg: 'rgba(232,121,168,0.15)', cat: 'Teatro' },
  'Teatro': { icon: 'MicVocal', color: '#E879A8', bg: 'rgba(232,121,168,0.15)', cat: 'Teatro' },
  'Conferencias': { icon: 'Mic', color: '#7F77DD', bg: 'rgba(83,74,183,0.2)', cat: 'Conferencias' },
  'Stand-up / Comedia': { icon: 'Smile', color: '#FAC775', bg: 'rgba(250,199,117,0.15)', cat: 'Comedia' },
  'Escuelas': { icon: 'GraduationCap', color: '#D85A30', bg: 'rgba(216,90,48,0.15)', cat: 'Escuelas' },
  'Networking': { icon: 'Users', color: '#534AB7', bg: 'rgba(83,74,183,0.15)', cat: 'Networking' },
  'Gastronomía': { icon: 'Utensils', color: '#FAC775', bg: 'rgba(250,199,117,0.15)', cat: 'Gastronomía' },
  'Comunidades': { icon: 'Globe', color: '#1D9E75', bg: 'rgba(29,158,117,0.15)', cat: 'Comunidades' },
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
  onEventClick: (id: string | number) => void;
}) {
  const [catFilter, setCatFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [countryIso, setCountryIso] = useState('');
  const [stateIso, setStateIso] = useState('');
  const [cityName, setCityName] = useState('');

  const latamIsoCodes = ['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'UY', 'VE'];
  const latamCountries = useMemo(() => {
    return Country.getAllCountries().filter(c => latamIsoCodes.includes(c.isoCode));
  }, []);

  const availableStates = useMemo(() => {
    return countryIso ? State.getStatesOfCountry(countryIso) : [];
  }, [countryIso]);

  const availableCities = useMemo(() => {
    return (countryIso && stateIso) ? City.getCitiesOfState(countryIso, stateIso).filter(c => 
      !c.name.includes('(') && 
      !c.name.includes('[') && 
      !c.name.includes('Ejido') && 
      !c.name.includes('Colonia') && 
      !c.name.includes('Fraccionamiento') &&
      !c.name.includes('Hacienda')
    ) : [];
  }, [countryIso, stateIso]);

  // Convertimos los eventos creados on-chain al mismo formato que los eventos demo
  const onChainAsEvents = createdEvents.map((ev: any) => {
    const style = catMap[ev.cat || ev.category || 'Otro'] || catMap['Otro'];
    const dateObj = ev.date && ev.date.includes('-') ? new Date(ev.date + 'T12:00') : null;
    const dateStr = dateObj
      ? dateObj.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
      : (ev.date || '');
    return {
      id: ev.id,
      icon: style.icon,
      color: style.color,
      bg: style.bg,
      name: ev.name,
      cat: style.cat,
      date: `${dateStr}${ev.time ? ' · ' + ev.time : ''}`,
      venue: ev.venue || '',
      city: ev.city || '',
      state: ev.state || '',
      country: ev.country || '',
      duration: '',
      price: ev.price,
      sold: 0,
      badge: 'new' as string,
      bLabel: 'On-chain',
      coverImage: ev.coverImage || undefined,
    };
  });

  // Mezclamos los eventos demo con los creados on-chain
  const allEvents = [...onChainAsEvents];
  
  const filteredEvents = allEvents.filter(e => {
    const matchesCat = catFilter === 'Todos' || e.cat === catFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      e.name.toLowerCase().includes(searchLower) || 
      e.cat.toLowerCase().includes(searchLower) ||
      e.venue.toLowerCase().includes(searchLower);
    
    const targetCountryName = countryIso ? latamCountries.find(c => c.isoCode === countryIso)?.name : '';
    const targetStateName = stateIso ? availableStates.find(s => s.isoCode === stateIso)?.name : '';
    
    const matchesLocation = (!targetCountryName || e.country === targetCountryName) &&
                            (!targetStateName || e.state === targetStateName) &&
                            (!cityName || e.city === cityName);
    
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
    setCountryIso('');
    setStateIso('');
    setCityName('');
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
            <QrCode size={28} color="#14F195" />
            <div>
              <p className="lp-feature-title">QR que cambia cada 30s</p>
              <p className="lp-feature-desc">Imposible de duplicar</p>
            </div>
          </div>
          <div className="lp-feature">
            <ShieldCheck size={28} color="#534AB7" />
            <div>
              <p className="lp-feature-title">Verificado en Solana</p>
              <p className="lp-feature-desc">Estado público, no privado</p>
            </div>
          </div>
          <div className="lp-feature">
            <TrendingDown size={28} color="#D85A30" />
            <div>
              <p className="lp-feature-title">Reventa con tope</p>
              <p className="lp-feature-desc">Nunca precio inflado</p>
            </div>
          </div>
        </section>

        <section className="lp-search-container">
          <div className="lp-search">
            <div className="lp-search-input" style={{ minWidth: 0 }}>
              <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}><Search size={18} color="#A1A1AA" /></span>
              <input 
                type="text" 
                placeholder="Busca tu evento, artista o venue" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', minWidth: 0 }}
              />
            </div>
            <div className="lp-search-filter" style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}><Calendar size={18} color="#A1A1AA" /></span>
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
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', minWidth: 0, fontSize: '13px', color: '#5F5E5A', cursor: 'pointer', colorScheme: 'light' }}
              />
            </div>
            <div className="lp-search-filter" style={{ display: 'flex', alignItems: 'center', flex: 3, minWidth: 0 }}>
              <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center', flexShrink: 0 }}><MapPin size={18} color="#4BAA46" /></span>
              <div style={{ display: 'flex', gap: '4px', flex: 1, minWidth: 0 }}>
                <select 
                  value={countryIso}
                  onChange={e => {
                    setCountryIso(e.target.value);
                    setStateIso('');
                    setCityName('');
                  }}
                  style={{ border: 'none', outline: 'none', background: 'transparent', flex: '1 1 0px', minWidth: 0, fontSize: '13px', color: '#5F5E5A', cursor: 'pointer', textOverflow: 'ellipsis' }}
                >
                  <option value="">País</option>
                  {latamCountries.map(c => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
                {countryIso && (
                  <select 
                    value={stateIso}
                    onChange={e => {
                      setStateIso(e.target.value);
                      setCityName('');
                    }}
                    style={{ border: 'none', outline: 'none', background: 'transparent', flex: '1 1 0px', minWidth: 0, fontSize: '13px', color: '#5F5E5A', cursor: 'pointer', textOverflow: 'ellipsis' }}
                  >
                    <option value="">Estado</option>
                    {availableStates.map(s => (
                      <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                    ))}
                  </select>
                )}
                {stateIso && (
                  <select 
                    value={cityName}
                    onChange={e => setCityName(e.target.value)}
                    style={{ border: 'none', outline: 'none', background: 'transparent', flex: '1 1 0px', minWidth: 0, fontSize: '13px', color: '#5F5E5A', cursor: 'pointer', textOverflow: 'ellipsis' }}
                  >
                    <option value="">Ciudad</option>
                    {availableCities.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <button type="button" className="lp-search-btn" onClick={() => document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' })} style={{ border: 'none' }}>Buscar</button>
          </div>
        </section>

        <section className="lp-cats-container">
          <div className="lp-cats-header">
            <h2 className="lp-cats-title">Explora por categoría</h2>
            {(catFilter !== 'Todos' || searchQuery || dateFilter || countryIso) && (
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
            {filteredEvents.length > 0 ? (
              filteredEvents.map((e, i) => {
                // Asignar imágenes de Unsplash según la categoría
              const catImages: Record<string, string> = {
                'Música': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
                'Arte': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80',
                'Feria': 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=600&q=80',
                'Teatro': 'https://images.unsplash.com/photo-1507676184212-d0330a15233c?auto=format&fit=crop&w=600&q=80',
                'Deporte': 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=600&q=80',
                'Otro': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
              };
              
              const defaultCoverImage = catImages[e.cat] || catImages['Otro'];
              const uniqueImage = (e as any).coverImage || `${defaultCoverImage}&sig=${e.id}`;

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
                      <p className="lp-event-meta" style={{ fontSize: '12px', color: '#8A8880', marginTop: '2px' }}>{[e.city, e.state, e.country].filter(Boolean).join(', ')}</p>
                    </div>
                    <div className="lp-event-footer">
                      <p className="lp-event-price">
                        {e.price === 0 ? 'Gratis' : `Desde ${e.price} SOL`}
                      </p>
                      <span className="lp-event-cat">{e.cat}</span>
                    </div>
                  </div>
                </div>
              );
              })
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5F5E5A', gridColumn: '1 / -1' }}>
                <SearchX size={48} color="#D3D1C7" style={{ margin: '0 auto 16px' }} />
                <p style={{ fontSize: '18px', fontWeight: 500, color: '#1E1E1E', marginBottom: '8px' }}>No se encontraron eventos</p>
                <p>Intenta con otros términos de búsqueda o elimina los filtros.</p>
                <button 
                  onClick={handleClearFilters}
                  style={{ marginTop: '16px', background: '#14F195', color: '#1E1E1E', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </section>
        <LandingFooter />
      </main>
    </div>
  );
}

