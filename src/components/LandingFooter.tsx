import React from 'react';

export function LandingFooter() {
  return (
    <footer className="lp-footer" style={{ borderTop: '0.5px solid #333333', padding: '40px 16px', background: '#1E1E1E', color: '#A1A1AA', fontSize: '13px', marginTop: '40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '32px' }}>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <img src="/icon.png" alt="Logo" style={{ height: '24px' }} />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>Mint<span style={{ color: '#4BAA46' }}>pass</span></span>
          </div>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Boletos verificables, imposibles de falsificar ni revender de más, creados en la blockchain de Solana.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
          <div>
            <h4 style={{ color: '#FFFFFF', margin: '0 0 16px', fontSize: '14px', fontWeight: 600 }}>Producto</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Explorar Eventos</a></li>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Para Organizadores</a></li>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Mis Tickets</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#FFFFFF', margin: '0 0 16px', fontSize: '14px', fontWeight: 600 }}>Soporte</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Centro de Ayuda</a></li>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Términos de Servicio</a></li>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidad</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '1100px', margin: '40px auto 0', paddingTop: '24px', borderTop: '0.5px solid #333333', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <span>© {new Date().getFullYear()} Mintpass. Todos los derechos reservados.</span>
        <span>Built on Solana</span>
      </div>
    </footer>
  );
}
