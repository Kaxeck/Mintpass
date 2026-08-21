import React from 'react';
import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <div className="lp-footer-brand-logo">
            <img src="/icon.png" alt="Logo" />
            <span className="lp-footer-brand-name">Mint<span className="lp-brand-accent">pass</span></span>
          </div>
          <p className="lp-footer-brand-desc">
            Boletos verificables, imposibles de falsificar ni revender de más, creados en la blockchain de Solana.
          </p>
        </div>
        
        <div className="lp-footer-columns">
          <div>
            <h4 className="lp-footer-col-title">Producto</h4>
            <ul className="lp-footer-col-list">
              <li><a href="#">Explorar Eventos</a></li>
              <li><a href="#">Para Organizadores</a></li>
              <li><a href="#">Mis Tickets</a></li>
            </ul>
          </div>
          <div>
            <h4 className="lp-footer-col-title">Soporte</h4>
            <ul className="lp-footer-col-list">
              <li><Link href="/ayuda">Centro de Ayuda</Link></li>
              <li><a href="#">Términos de Servicio</a></li>
              <li><a href="#">Privacidad</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="lp-footer-bottom">
        <span>© {new Date().getFullYear()} Mintpass. Todos los derechos reservados.</span>
        <span>Built on Solana</span>
      </div>
    </footer>
  );
}
