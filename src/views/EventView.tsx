import React from 'react';
import { LandingNavBar } from '../components/LandingNavBar';
import { LandingFooter } from '../components/LandingFooter';
import * as Icons from 'lucide-react';
import '../Home.css';

export default function EventView({ onBack, onGoToMyTickets, onGoToOrganizer }: { onBack?: () => void, onGoToMyTickets?: () => void, onGoToOrganizer?: () => void }) {
  // same catImages from Home
  const catImages: Record<string, string> = {
    'Música': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    'Arte': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80',
    'Feria': 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=600&q=80',
    'Teatro': 'https://images.unsplash.com/photo-1507676184212-d0330a15233c?auto=format&fit=crop&w=600&q=80',
    'Deporte': 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=600&q=80',
    'Otro': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
  };

  const getBg = (cat: string, id: number) => `url("${catImages[cat] || catImages['Otro']}&sig=${id}")`;

  return (
    <div className="lp-container">
      <main className="lp-content">
        <LandingNavBar onGoToExplore={() => {}} onGoToMyTickets={onGoToMyTickets} onGoToOrganizer={onGoToOrganizer} />
        
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px 80px' }}>
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
            <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '8px', border: '0.5px solid #D3D1C7', borderRadius: '12px', padding: '14px 16px', fontSize: '15px', color: '#5F5E5A', background: '#F7F8F7' }}>
              <Icons.Search size={18} color="#A1A1AA" />
              Buscar eventos, artistas, venues...
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px', border: '0.5px solid #D3D1C7', borderRadius: '12px', padding: '14px 16px', fontSize: '15px', color: '#1E1E1E', background: '#F7F8F7' }}>
              <Icons.MapPin size={18} color="#4BAA46" />
              León, Gto
            </div>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '8px' }}>
            <div style={{ background: '#1E1E1E', color: '#FFFFFF', fontSize: '14px', padding: '10px 20px', borderRadius: '24px', cursor: 'pointer' }}>Todos</div>
            <div style={{ border: '0.5px solid #D3D1C7', color: '#5F5E5A', fontSize: '14px', padding: '10px 20px', borderRadius: '24px', cursor: 'pointer' }}>Este fin</div>
            <div style={{ border: '0.5px solid #D3D1C7', color: '#5F5E5A', fontSize: '14px', padding: '10px 20px', borderRadius: '24px', cursor: 'pointer' }}>Conciertos</div>
            <div style={{ border: '0.5px solid #D3D1C7', color: '#5F5E5A', fontSize: '14px', padding: '10px 20px', borderRadius: '24px', cursor: 'pointer' }}>Bares y venues</div>
            <div style={{ border: '0.5px solid #D3D1C7', color: '#5F5E5A', fontSize: '14px', padding: '10px 20px', borderRadius: '24px', cursor: 'pointer' }}>Cultura</div>
          </div>

          {/* Eventos Grid */}
          <div className="lp-events-grid">
            
            <div className="lp-event-card">
              <div className="lp-event-cover" style={{ backgroundImage: getBg('Música', 101), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <span className="lp-event-badge">Verificado</span>
              </div>
              <div className="lp-event-body">
                <div>
                  <p className="lp-event-name">Festival Sonora Norte</p>
                  <p className="lp-event-meta">15 ago · León, Gto</p>
                </div>
                <div className="lp-event-footer">
                  <p className="lp-event-price">Desde $650 MXN</p>
                  <span className="lp-event-cat">Música</span>
                </div>
              </div>
            </div>

            <div className="lp-event-card">
              <div className="lp-event-cover" style={{ backgroundImage: getBg('Arte', 102), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <span className="lp-event-badge">Verificado</span>
              </div>
              <div className="lp-event-body">
                <div>
                  <p className="lp-event-name">Noche de jazz</p>
                  <p className="lp-event-meta">22 ago · Bar Alcatraz</p>
                </div>
                <div className="lp-event-footer">
                  <p className="lp-event-price">Desde $300 MXN</p>
                  <span className="lp-event-cat">Arte</span>
                </div>
              </div>
            </div>

            <div className="lp-event-card">
              <div className="lp-event-cover" style={{ backgroundImage: getBg('Feria', 103), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <span className="lp-event-badge">Verificado</span>
              </div>
              <div className="lp-event-body">
                <div>
                  <p className="lp-event-name">Feria creativa</p>
                  <p className="lp-event-meta">30 ago · Parque Metro</p>
                </div>
                <div className="lp-event-footer">
                  <p className="lp-event-price">Desde $120 MXN</p>
                  <span className="lp-event-cat">Feria</span>
                </div>
              </div>
            </div>

            <div className="lp-event-card">
              <div className="lp-event-cover" style={{ backgroundImage: getBg('Teatro', 104), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <span className="lp-event-badge">Verificado</span>
              </div>
              <div className="lp-event-body">
                <div>
                  <p className="lp-event-name">Stand-up comedy</p>
                  <p className="lp-event-meta">18 ago · Teatro Doblado</p>
                </div>
                <div className="lp-event-footer">
                  <p className="lp-event-price">Desde $250 MXN</p>
                  <span className="lp-event-cat">Teatro</span>
                </div>
              </div>
            </div>

            <div className="lp-event-card">
              <div className="lp-event-cover" style={{ backgroundImage: getBg('Deporte', 105), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <span className="lp-event-badge">Verificado</span>
              </div>
              <div className="lp-event-body">
                <div>
                  <p className="lp-event-name">Hackathon Web3</p>
                  <p className="lp-event-meta">2 sep · UVEG León</p>
                </div>
                <div className="lp-event-footer">
                  <p className="lp-event-price">Gratis</p>
                  <span className="lp-event-cat">Tecnología</span>
                </div>
              </div>
            </div>

            <div className="lp-event-card">
              <div className="lp-event-cover" style={{ backgroundImage: getBg('Otro', 106), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <span className="lp-event-badge">Verificado</span>
              </div>
              <div className="lp-event-body">
                <div>
                  <p className="lp-event-name">Mercado creativo</p>
                  <p className="lp-event-meta">5 sep · Centro</p>
                </div>
                <div className="lp-event-footer">
                  <p className="lp-event-price">Desde $80 MXN</p>
                  <span className="lp-event-cat">Feria</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
