import React, { useState, useMemo } from 'react';
import { LandingNavBar } from '../../components/layout/LandingNavBar';
import { LandingFooter } from '../../components/layout/LandingFooter';
import * as Icons from 'lucide-react';
import '../../styles/Home.css';
import { Country, State, City } from 'country-state-city';



export default function EventView({ events = [], onBack, onGoToMyTickets, onGoToOrganizer, onEventClick }: { events?: any[], onBack?: () => void, onGoToMyTickets?: () => void, onGoToOrganizer?: () => void, onEventClick?: (id: string | number) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState('Todos');
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

  const catImages: Record<string, string> = {
    'Música': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    'Arte': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80',
    'Feria': 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=600&q=80',
    'Teatro': 'https://images.unsplash.com/photo-1507676184212-d0330a15233c?auto=format&fit=crop&w=600&q=80',
    'Deporte': 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=600&q=80',
    'Tecnología': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    'Otro': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
  };

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

  const getBg = (e: any) => e.coverImage ? `url("${e.coverImage}")` : `url("${catImages[e.cat || e.category] || catImages['Otro']}&sig=${e.id}")`;

  const displayEvents = events;

  const filteredEvents = displayEvents.filter(e => {
    const uiCat = e.uiCat || e.category || e.cat;
    const matchesCat = catFilter === 'Todos' || uiCat === catFilter || (catFilter === 'Este fin' && e.date.includes('ago'));
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      e.name.toLowerCase().includes(searchLower) || 
      (uiCat || '').toLowerCase().includes(searchLower) ||
      (e.venue || '').toLowerCase().includes(searchLower);
    
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
        const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const month = monthNames[d.getMonth()];
        const searchDate = `${day} ${month}`;
        matchesDate = e.date.toLowerCase().includes(searchDate);
      }
    }
    
    return matchesCat && matchesSearch && matchesLocation && matchesDate;
  });

  const categories = ['Todos', 'Este fin', 'Conciertos', 'Bares y venues', 'Cultura'];

  return (
    <div className="lp-container">
      <main className="lp-content">
        <LandingNavBar onGoToExplore={() => {}} onGoToMyTickets={onGoToMyTickets} onGoToOrganizer={onGoToOrganizer} />
        
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 16px 80px' }}>
          {/* Header de la sección */}
          <div style={{ marginBottom: '32px' }}>
            <button 
              onClick={onBack}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#5F5E5A', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: '16px' }}
              onMouseOver={e => e.currentTarget.style.color = '#1E1E1E'} 
              onMouseOut={e => e.currentTarget.style.color = '#5F5E5A'}
            >
              <Icons.ArrowLeft size={16} /> Volver al inicio
            </button>
            <h1 style={{ fontSize: '32px', fontWeight: 600, color: '#1E1E1E', margin: 0 }}>Explorar Eventos</h1>
          </div>

          {/* Búsqueda */}
          <div className="lp-search-container" style={{ padding: 0, marginBottom: '32px', maxWidth: '100%' }}>
            <div className="lp-search">
              <div className="lp-search-input" style={{ minWidth: 0 }}>
                <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}><Icons.Search size={18} color="#A1A1AA" /></span>
                <input 
                  type="text" 
                  placeholder="Busca tu evento, artista o venue" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', minWidth: 0 }}
                />
              </div>
              <div className="lp-search-filter" style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
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
                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', minWidth: 0, fontSize: '13px', color: '#5F5E5A', cursor: 'pointer', colorScheme: 'light' }}
                />
              </div>
              <div className="lp-search-filter" style={{ display: 'flex', alignItems: 'center', flex: 3, minWidth: 0 }}>
                <span style={{ marginRight: '8px', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Icons.MapPin size={18} color="#4BAA46" /></span>
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
              <button type="button" className="lp-search-btn" style={{ border: 'none' }} onClick={() => {}}>Buscar</button>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '8px' }}>
            {categories.map(cat => (
              <div 
                key={cat}
                onClick={() => setCatFilter(cat)}
                style={{ 
                  background: catFilter === cat ? '#1E1E1E' : 'transparent', 
                  color: catFilter === cat ? '#FFFFFF' : '#5F5E5A', 
                  border: catFilter === cat ? 'none' : '0.5px solid #D3D1C7',
                  fontSize: '14px', 
                  padding: '10px 20px', 
                  borderRadius: '24px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {cat}
              </div>
            ))}
          </div>

          {/* Eventos Grid */}
          <div className="lp-events-grid">
            {filteredEvents.length > 0 ? (
              filteredEvents.map(e => {
                const style = catMap[e.cat || e.category || 'Otro'] || catMap['Otro'];
                return (
                  <div key={e.id} className="lp-event-card" onClick={() => onEventClick?.(e.id)} style={{ cursor: onEventClick ? 'pointer' : 'default' }}>
                    <div className="lp-event-cover" style={{ backgroundImage: getBg(e), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      <span className="lp-event-badge">Verificado</span>
                    </div>
                    <div className="lp-event-body">
                      <div>
                        <p className="lp-event-name">{e.name}</p>
                        <p className="lp-event-meta">{e.date}</p>
                        <p className="lp-event-meta" style={{ fontSize: '11px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Icons.MapPin size={12} color="#4BAA46" />
                          {e.city && e.state ? `${e.city}, ${e.state}, ${e.country}` : 'Ubicación no especificada'}
                        </p>
                      </div>
                      <div className="lp-event-footer">
                        <p className="lp-event-price">{e.price}</p>
                        <span className="lp-event-cat" style={{ background: style.bg, color: style.color }}>
                          {style.cat}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5F5E5A', gridColumn: '1 / -1' }}>
                <Icons.SearchX size={48} color="#D3D1C7" style={{ margin: '0 auto 16px' }} />
                <p style={{ fontSize: '18px', fontWeight: 500, color: '#1E1E1E', marginBottom: '8px' }}>No se encontraron eventos</p>
                <p>Intenta con otros términos de búsqueda o elimina los filtros.</p>
                <button 
                  onClick={() => { 
                    setSearchQuery(''); 
                    setCatFilter('Todos'); 
                    setDateFilter('');
                    setCountryIso('');
                    setStateIso('');
                    setCityName('');
                  }}
                  style={{ marginTop: '16px', background: '#14F195', color: '#1E1E1E', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
        <LandingFooter />
      </main>
    </div>
  );
}
