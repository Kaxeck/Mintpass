'use client';
import { LandingNavBar } from "../../components/layout/LandingNavBar";
import { LandingFooter } from "../../components/layout/LandingFooter";
import '../../styles/organizer-landing.css';
import '../../styles/layout.css';
import { useActiveSolanaWallet } from "../../hooks/useActiveSolanaWallet";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface OrganizerLandingProps {
  onGoToExplore?: () => void;
  onGoToMyTickets?: () => void;
}

export default function OrganizerLanding({
  onGoToExplore,
  onGoToMyTickets,
}: OrganizerLandingProps) {
  const { login, authenticated, walletAddress } = useActiveSolanaWallet();
  const router = useRouter();

  // Redirigir automáticamente al dashboard si el usuario inicia sesión
  useEffect(() => {
    const isConnected = authenticated || !!walletAddress;
    
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [authenticated, walletAddress, router]);

  return (
    <div className="lp-container">
      <LandingNavBar
        onGoToExplore={onGoToExplore}
        onGoToMyTickets={onGoToMyTickets}
      />
      <div className="lp-content">
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px' }}>        <div className="org-hero">
          <div className="org-hero-text">
            <p className="org-hero-tag">PLATAFAFORMA DE BOLETERÍA DIGITAL</p>
            <p className="org-hero-title">Gestiona tu evento<br />con total control y cero complicaciones</p>
            <p className="org-hero-sub">Venta de entradas infalsificables, validación rápida en puerta incluso sin internet y control total de tu boletaje. Tú solo enfócate en tu evento.</p>
            <div className="org-hero-btns">
              <div 
                style={{ background: '#14F195', color: '#1E1E1E', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }} 
                onClick={login}
              >
                Crear mi evento gratis
              </div>
              <div 
                style={{ border: '0.5px solid #D3D1C7', color: '#1E1E1E', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
                onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver cómo funciona
              </div>
            </div>
          </div>
          <div className="org-hero-preview">
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#B4B2A9' }}>Dashboard en vivo</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1, background: '#2C2C2A', borderRadius: '8px', padding: '8px' }}>
                <p style={{ margin: 0, fontSize: '9px', color: '#9FE1CB' }}>Vendidos</p>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: '500' }}>842</p>
              </div>
              <div style={{ flex: 1, background: '#2C2C2A', borderRadius: '8px', padding: '8px' }}>
                <p style={{ margin: 0, fontSize: '9px', color: '#9FE1CB' }}>Ingresos</p>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: '500' }}>$584k</p>
              </div>
            </div>
            <div style={{ background: '#2C2C2A', borderRadius: '8px', padding: '8px' }}>
              <p style={{ margin: 0, fontSize: '9px', color: '#9FE1CB' }}>Puntuación de Organizador</p>
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: '500' }}>92 / 100</p>
            </div>
          </div>
        </div>

        <div className="org-stats-strip">
          <div className="org-stat-item">
            <p className="org-stat-title">100% Seguro</p>
            <p className="org-stat-sub">Autenticidad garantizada</p>
          </div>
          <div className="org-stat-item">
            <p className="org-stat-title">Fondos Protegidos</p>
            <p className="org-stat-sub">Seguridad de nivel bancario</p>
          </div>
          <div className="org-stat-item">
            <p className="org-stat-title">$0 costo inicial</p>
            <p className="org-stat-sub">Sin cargos por configuración</p>
          </div>
          <div className="org-stat-item">
            <p className="org-stat-title">Modo Offline</p>
            <p className="org-stat-sub">Escaneo fácil sin internet</p>
          </div>
        </div>

        <div className="org-features" id="features-section">
          <p className="org-features-title">Todo lo que necesitas para operar tu evento</p>
          <div className="org-features-grid">
            <div className="org-feat-card">
              <p className="org-feat-card-title">Creación de eventos</p>
              <p className="org-feat-card-desc">Configura precios, aforo y boletaje</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Pagos flexibles</p>
              <p className="org-feat-card-desc">Acepta tarjetas y pagos digitales</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Validación en puerta</p>
              <p className="org-feat-card-desc">Escaneo rápido sin fallas de señal</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Sistema Antifraude</p>
              <p className="org-feat-card-desc">QR dinámico e infalsificable</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Control de Reventa</p>
              <p className="org-feat-card-desc">Tope de precio para proteger a tu público</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Métricas y Reportes</p>
              <p className="org-feat-card-desc">Estadísticas de venta en tiempo real</p>
            </div>
          </div>
        </div>

        <div className="org-plans">
          <p className="org-plans-title">Planes</p>
          <div className="org-plans-grid">
            <div className="org-plan-card">
              <p className="org-plan-name">Gratuito</p>
              <p className="org-plan-price">Comisión por boleto vendido</p>
              <p className="org-plan-desc">1 evento activo · reportes básicos</p>
            </div>
            <div className="org-plan-card highlight">
              <span className="org-plan-badge">Más elegido</span>
              <p className="org-plan-name">Pro</p>
              <p className="org-plan-price">Comisión + cuota mensual</p>
              <p className="org-plan-desc">Eventos ilimitados · analíticas avanzadas</p>
            </div>
            <div className="org-plan-card">
              <p className="org-plan-name">Personalizado</p>
              <p className="org-plan-price">A la medida</p>
              <p className="org-plan-desc">Branding exclusivo · soporte dedicado</p>
            </div>
          </div>
        </div>

        <div className="org-cta">
          <p className="org-cta-title">¿Listo para operar tu próximo evento?</p>
          <div 
            style={{ display: 'inline-block', background: '#14F195', color: '#1E1E1E', padding: '12px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }} 
            onClick={login}
          >
            Crear mi evento gratis
          </div>
        </div>

        </div>
        <LandingFooter />
      </div>
    </div>
  );
}
