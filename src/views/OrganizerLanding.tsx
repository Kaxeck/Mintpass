'use client';
import { LandingNavBar } from "../components/LandingNavBar";
import { LandingFooter } from "../components/LandingFooter";
import '../Home.css';
import { usePrivy } from "@privy-io/react-auth";
import { useWalletSession } from "@solana/react-hooks";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface OrganizerLandingProps {
  onGoToExplore?: () => void;
  onGoToMyTickets?: () => void;
}

export default function OrganizerLanding({
  onGoToExplore,
  onGoToMyTickets,
}: OrganizerLandingProps) {
  const { login, authenticated, user } = usePrivy();
  const session = useWalletSession();
  const router = useRouter();

  // Redirigir automáticamente al dashboard si el usuario inicia sesión
  useEffect(() => {
    const walletAddressStr = user?.wallet?.address || session?.account?.address?.toString() || null;
    const isConnected = authenticated || !!walletAddressStr;
    
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [authenticated, user, session, router]);

  return (
    <div className="lp-container">
      <LandingNavBar
        onGoToExplore={onGoToExplore}
        onGoToMyTickets={onGoToMyTickets}
      />
      <div className="lp-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px' }}>

        <div className="org-hero">
          <div className="org-hero-text">
            <p className="org-hero-tag">INFRAESTRUCTURA SOBRE SOLANA</p>
            <p className="org-hero-title">Opera tu evento sin<br />construir tecnología propia</p>
            <p className="org-hero-sub">Boletos verificables on-chain, check-in offline, reventa controlada y reputación portable. Tú te enfocas en el evento.</p>
            <div className="org-hero-btns">
              <div 
                style={{ background: '#14F195', color: '#1E1E1E', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} 
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
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 500 }}>842</p>
              </div>
              <div style={{ flex: 1, background: '#2C2C2A', borderRadius: '8px', padding: '8px' }}>
                <p style={{ margin: 0, fontSize: '9px', color: '#9FE1CB' }}>Ingresos</p>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 500 }}>$584k</p>
              </div>
            </div>
            <div style={{ background: '#2C2C2A', borderRadius: '8px', padding: '8px' }}>
              <p style={{ margin: 0, fontSize: '9px', color: '#9FE1CB' }}>Reputación on-chain</p>
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 500 }}>92 / 100</p>
            </div>
          </div>
        </div>

        <div className="org-stats-strip">
          <div className="org-stat-item">
            <p className="org-stat-title">4 programas</p>
            <p className="org-stat-sub">Anchor auditables</p>
          </div>
          <div className="org-stat-item">
            <p className="org-stat-title">Multisig 2-de-3</p>
            <p className="org-stat-sub">Squads Protocol</p>
          </div>
          <div className="org-stat-item">
            <p className="org-stat-title">$0 setup</p>
            <p className="org-stat-sub">Free tier para MVP</p>
          </div>
          <div className="org-stat-item">
            <p className="org-stat-title">Offline-first</p>
            <p className="org-stat-sub">Check-in sin internet</p>
          </div>
        </div>

        <div className="org-features" id="features-section">
          <p className="org-features-title">Todo lo que necesitas para operar tu evento</p>
          <div className="org-features-grid">
            <div className="org-feat-card">
              <p className="org-feat-card-title">Creación de eventos</p>
              <p className="org-feat-card-desc">Precio, aforo, tipos de boleto</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Venta multicanal</p>
              <p className="org-feat-card-desc">Fiat, wallet y Blinks</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Check-in en puerta</p>
              <p className="org-feat-card-desc">PWA offline-first</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Antifraude por capas</p>
              <p className="org-feat-card-desc">QR dinámico, blacklist</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Reventa oficial</p>
              <p className="org-feat-card-desc">Tope de precio on-chain</p>
            </div>
            <div className="org-feat-card">
              <p className="org-feat-card-title">Reputación y datos</p>
              <p className="org-feat-card-desc">Historial verificable</p>
            </div>
          </div>
        </div>

        <div className="org-plans">
          <p className="org-plans-title">Planes</p>
          <div className="org-plans-grid">
            <div className="org-plan-card">
              <p className="org-plan-name">Free</p>
              <p className="org-plan-price">Comisión por boleto</p>
              <p className="org-plan-desc">1 evento activo · reportes básicos</p>
            </div>
            <div className="org-plan-card highlight">
              <span className="org-plan-badge">Más elegido</span>
              <p className="org-plan-name">Pro</p>
              <p className="org-plan-price">Comisión + mensualidad</p>
              <p className="org-plan-desc">Eventos ilimitados · analytics · rewards</p>
            </div>
            <div className="org-plan-card">
              <p className="org-plan-name">Enterprise</p>
              <p className="org-plan-price">Cotización</p>
              <p className="org-plan-desc">Custom branding · soporte dedicado</p>
            </div>
          </div>
        </div>

        <div className="org-cta">
          <p className="org-cta-title">¿Listo para operar tu próximo evento?</p>
          <div 
            style={{ display: 'inline-block', background: '#14F195', color: '#1E1E1E', padding: '12px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} 
            onClick={login}
          >
            Crear mi evento gratis
          </div>
        </div>

      </div>
      <LandingFooter />
    </div>
  );
}
