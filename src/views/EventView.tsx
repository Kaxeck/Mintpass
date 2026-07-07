import React, { useState } from 'react';
import { LandingNavBar } from '../components/LandingNavBar';
import { LandingFooter } from '../components/LandingFooter';
import * as Icons from 'lucide-react';
import '../Home.css';

const LOCAL_EVENTS = [
  { id: 101, name: "Festival Sonora Norte", date: "15 ago · León, Gto", price: "Desde $650 MXN", cat: "Música", uiCat: "Conciertos" },
  { id: 102, name: "Noche de jazz", date: "22 ago · Bar Alcatraz", price: "Desde $300 MXN", cat: "Arte", uiCat: "Bares y venues" },
  { id: 103, name: "Feria creativa", date: "30 ago · Parque Metro", price: "Desde $120 MXN", cat: "Feria", uiCat: "Cultura" },
  { id: 104, name: "Stand-up comedy", date: "18 ago · Teatro Doblado", price: "Desde $250 MXN", cat: "Teatro", uiCat: "Cultura" },
  { id: 105, name: "Hackathon Web3", date: "2 sep · UVEG León", price: "Gratis", cat: "Tecnología", uiCat: "Cultura" },
  { id: 106, name: "Mercado creativo", date: "5 sep · Centro", price: "Desde $80 MXN", cat: "Feria", uiCat: "Cultura" }
];

export default function EventView({ onBack, onGoToMyTickets, onGoToOrganizer, onEventClick }: { onBack?: () => void, onGoToMyTickets?: () => void, onGoToOrganizer?: () => void, onEventClick?: (id: number) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState('Todos');

  const catImages: Record<string, string> = {
    'Música': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    'Arte': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80',
    'Feria': 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=600&q=80',
    'Teatro': 'https://images.unsplash.com/photo-1507676184212-d0330a15233c?auto=format&fit=crop&w=600&q=80',
    'Deporte': 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=600&q=80',
    'Tecnología': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    'Otro': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
  };

  const getBg = (cat: string, id: number) => `url("${catImages[cat] || catImages['Otro']}&sig=${id}")`;

  const filteredEvents = LOCAL_EVENTS.filter(e => {
    const matchesCat = catFilter === 'Todos' || e.uiCat === catFilter || (catFilter === 'Este fin' && e.date.includes('ago'));
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      e.name.toLowerCase().includes(searchLower) || 
      e.cat.toLowerCase().includes(searchLower) ||
      e.date.toLowerCase().includes(searchLower);
    
    return matchesCat && matchesSearch;
  });

  const categories = ['Todos', 'Este fin', 'Conciertos', 'Bares y venues', 'Cultura'];

  return (
    <div className="lp-container">
      <main className="lp-content">
        <LandingNavBar onGoToExplore={() => {}} onGoToMyTickets={onGoToMyTickets} onGoToOrganizer={onGoToOrganizer} />
        
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 16px 80px' }}>
          {/* Header de la sección */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <button 
              onClick={onBack}
              style={{ background: '#F7F8F7', border: '0.5px solid #D3D1C7', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1E1E1E', fontSize: '20px' }}
            >
              <Icons.ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1E1E1E', margin: 0 }}>Explorar Eventos</h1>
          </div>

          {/* Búsqueda */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '8px', border: '0.5px solid #D3D1C7', borderRadius: '12px', padding: '0 16px', fontSize: '15px', color: '#5F5E5A', background: '#F7F8F7' }}>
              <Icons.Search size={18} color="#A1A1AA" />
              <input 
                type="text"
                placeholder="Buscar eventos, artistas, venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: '14px 0', fontSize: '15px', color: '#1E1E1E' }}
              />
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px', border: '0.5px solid #D3D1C7', borderRadius: '12px', padding: '14px 16px', fontSize: '15px', color: '#1E1E1E', background: '#F7F8F7' }}>
              <Icons.MapPin size={18} color="#4BAA46" />
              León, Gto
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
              filteredEvents.map(e => (
                <div key={e.id} className="lp-event-card" onClick={() => onEventClick?.(e.id)} style={{ cursor: onEventClick ? 'pointer' : 'default' }}>
                  <div className="lp-event-cover" style={{ backgroundImage: getBg(e.cat, e.id), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <span className="lp-event-badge">Verificado</span>
                  </div>
                  <div className="lp-event-body">
                    <div>
                      <p className="lp-event-name">{e.name}</p>
                      <p className="lp-event-meta">{e.date}</p>
                    </div>
                    <div className="lp-event-footer">
                      <p className="lp-event-price">{e.price}</p>
                      <span className="lp-event-cat">{e.cat}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5F5E5A', gridColumn: '1 / -1' }}>
                <Icons.SearchX size={48} color="#D3D1C7" style={{ margin: '0 auto 16px' }} />
                <p style={{ fontSize: '18px', fontWeight: 500, color: '#1E1E1E', marginBottom: '8px' }}>No se encontraron eventos</p>
                <p>Intenta con otros términos de búsqueda o elimina los filtros.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setCatFilter('Todos'); }}
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
