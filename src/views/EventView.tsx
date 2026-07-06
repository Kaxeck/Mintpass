import React from 'react';
import WalletMultiButton from '../components/WalletButton';

export default function EventView({ onBack }: { onBack?: () => void }) {
  return (
    <div className="lp-container">
      <div className="lp-content" style={{ padding: '20px' }}>
        
        {/* Navbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '20px', borderBottom: '0.5px solid #D3D1C7', marginBottom: '20px' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#1E1E1E', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={onBack}>
            <img src="/icon.png" alt="Logo" style={{ height: '20px' }} />
            <span>Mint<span style={{ color: '#4BAA46' }}>pass</span></span>
          </span>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center', fontSize: '12px', color: '#5F5E5A' }}>
            <span style={{ color: '#1E1E1E', fontWeight: 500 }}>Explorar</span>
            <WalletMultiButton style={{ border: '0.5px solid #D3D1C7', borderRadius: '8px', padding: '6px 14px', color: '#1E1E1E', background: 'transparent', fontSize: '13px', fontFamily: 'inherit', height: 'auto', lineHeight: 1 }} />
          </div>
        </div>

        {/* Búsqueda */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <div style={{ flex: 1, border: '0.5px solid #D3D1C7', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#5F5E5A' }}>Buscar eventos, artistas, venues...</div>
          <div style={{ border: '0.5px solid #D3D1C7', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#1E1E1E' }}>León, Gto</div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <div style={{ background: '#1E1E1E', color: '#FFFFFF', fontSize: '12px', padding: '7px 14px', borderRadius: '20px', cursor: 'pointer' }}>Todos</div>
          <div style={{ border: '0.5px solid #D3D1C7', color: '#5F5E5A', fontSize: '12px', padding: '7px 14px', borderRadius: '20px', cursor: 'pointer' }}>Este fin</div>
          <div style={{ border: '0.5px solid #D3D1C7', color: '#5F5E5A', fontSize: '12px', padding: '7px 14px', borderRadius: '20px', cursor: 'pointer' }}>Conciertos</div>
          <div style={{ border: '0.5px solid #D3D1C7', color: '#5F5E5A', fontSize: '12px', padding: '7px 14px', borderRadius: '20px', cursor: 'pointer' }}>Bares y venues</div>
          <div style={{ border: '0.5px solid #D3D1C7', color: '#5F5E5A', fontSize: '12px', padding: '7px 14px', borderRadius: '20px', cursor: 'pointer' }}>Cultura</div>
        </div>

        {/* Eventos Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
          
          <div style={{ cursor: 'pointer' }}>
            <div style={{ height: '110px', background: '#EAF3DE', borderRadius: '10px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#FFFFFF', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', color: '#27500A', fontWeight: 500 }}>Verificado</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Festival Sonora Norte</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#5F5E5A' }}>15 ago · León, Gto</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Desde $650 MXN</p>
          </div>

          <div style={{ cursor: 'pointer' }}>
            <div style={{ height: '110px', background: '#EEEDFE', borderRadius: '10px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#FFFFFF', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', color: '#27500A', fontWeight: 500 }}>Verificado</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Noche de jazz</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#5F5E5A' }}>22 ago · Bar Alcatraz</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Desde $300 MXN</p>
          </div>

          <div style={{ cursor: 'pointer' }}>
            <div style={{ height: '110px', background: '#FAECE7', borderRadius: '10px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#FFFFFF', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', color: '#27500A', fontWeight: 500 }}>Verificado</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Feria creativa</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#5F5E5A' }}>30 ago · Parque Metro</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Desde $120 MXN</p>
          </div>

          <div style={{ cursor: 'pointer' }}>
            <div style={{ height: '110px', background: '#FBEAF0', borderRadius: '10px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#FFFFFF', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', color: '#27500A', fontWeight: 500 }}>Verificado</span>
              <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: '#1E1E1E', color: '#FFFFFF', borderRadius: '6px', padding: '3px 8px', fontSize: '10px' }}>Últimos boletos</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Stand-up comedy</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#5F5E5A' }}>18 ago · Teatro Doblado</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Desde $250 MXN</p>
          </div>

          <div style={{ cursor: 'pointer' }}>
            <div style={{ height: '110px', background: '#E1F5EE', borderRadius: '10px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#FFFFFF', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', color: '#27500A', fontWeight: 500 }}>Verificado</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Hackathon Web3</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#5F5E5A' }}>2 sep · UVEG León</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Gratis</p>
          </div>

          <div style={{ cursor: 'pointer' }}>
            <div style={{ height: '110px', background: '#FAEEDA', borderRadius: '10px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#FFFFFF', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', color: '#27500A', fontWeight: 500 }}>Verificado</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Mercado creativo</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#5F5E5A' }}>5 sep · Centro</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 500, color: '#1E1E1E' }}>Desde $80 MXN</p>
          </div>

        </div>
      </div>
    </div>
  );
}
