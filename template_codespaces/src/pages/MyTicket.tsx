import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import PageNav from "../components/PageNav";
import "../index.css";

const PERIOD = 30; // 30 segundos de vigencia del código QR

// Diferentes patrones de QR (simulados con arrays de 0 y 1 para rellenar el grid)
const patterns = [
  [1,1,1,1,1,1,1,0,1,0,1,1,0,0,0,0,0,1,0,0,1,0,1,0,1,1,1,0,1,0,1,1,1,1,0,1,0,0,0,1,1,0,1,1,1,0,1,0,0,0,1,0,0,0,0,0,1,1,1,0,0,1,1,1,1,1,1,1,0,1,0,1,0,0,0,0,1,0,0,1,0,1,0,1,0,1,1,0,1,1,0,0,1,0,0,1,0,0,0,1,1,0,1,0,1,0,0,0,0,1,0,0,1,0,1,1,0,1,0,0,1],
  [1,1,1,1,1,1,1,0,0,1,1,1,0,0,0,0,0,1,1,0,1,0,1,0,1,1,1,0,0,1,0,1,0,1,1,1,0,1,0,0,1,0,1,0,1,1,1,0,1,1,0,1,0,0,0,0,0,1,0,0,0,1,1,1,1,1,1,1,0,1,1,0,0,1,0,0,0,0,0,0,1,0,1,1,0,1,1,1,0,1,1,0,0,0,1,0,0,1,0,1,0,0,1,1,0,1,0,0,0,1,0,0,0,1,0,0,1,1,0,0,1],
  [1,1,1,1,1,1,1,0,1,1,0,1,0,0,0,0,0,1,1,0,0,1,1,0,1,1,1,0,1,0,1,1,0,1,1,1,0,1,1,0,0,1,0,1,1,1,0,1,0,0,1,0,0,0,0,0,1,0,1,1,0,1,1,1,1,1,1,1,0,0,1,0,0,0,1,0,0,0,0,1,1,0,1,1,1,0,0,1,1,0,0,0,1,1,0,0,1,0,1,0,0,1,0,1,0,0,0,1,1,0,1,0,1,1,0,0,0,1,1,0,0],
];

export default function MyTicket({ event, onBack }: { event: any, onBack: () => void }) {
  const [secs, setSecs] = useState(PERIOD);
  const [patIdx, setPatIdx] = useState(0);
  const [rotations, setRotations] = useState(0);
  const [flash, setFlash] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hook para controlar el reloj descendente y la rotación del QR dinámico
  useEffect(() => {
    window.scrollTo(0, 0); // Resetear posición de vista
    
    const interval = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1) {
          // Disparamos el destello para indicar la rotación de seguridad
          setFlash(true);
          setTimeout(() => setFlash(false), 200);
          
          // Cambiamos al siguiente patrón QR circularmente
          setPatIdx(p => (p + 1) % patterns.length);
          setRotations(r => r + 1);
          return PERIOD; // Reseteamos el reloj
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Manejo de la acción de compartir
  const handleShare = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  // Lógica visual basada en el tiempo restante
  const pct = (secs / PERIOD) * 100;
  const barColor = secs > 15 ? '#534AB7' : secs > 8 ? '#EF9F27' : '#E24B4A';
  const dotColor = secs > 15 ? '#7F77DD' : secs > 8 ? '#FAC775' : '#F09595';
  const labelColor = secs <= 5 ? '#E24B4A' : 'var(--color-text-secondary)';
  const labelText = secs <= 5 ? `Renovando QR en ${secs}s…` : 'Muestra este QR en la entrada';

  // Obtenemos el grid del array binario del patrón actual (simulando los píxeles del QR)
  const currentPattern = patterns[patIdx];

  const EventIcon = (Icons as any)[event?.icon || 'Music'] || Icons.HelpCircle;

  return (
    <div className="app">
      <PageNav 
        onBack={onBack} 
        title="Mi ticket" 
        rightElement={<span className="wallet-chip">7xKf…9pQm</span>} 
      />

      <div className="main" style={{ maxWidth: '380px' }}>
        
        {/* Tarjeta del Ticket que se mostrará al escáner */}
        <div className="ticket-card">
          <div className="ticket-header" style={{ background: event?.bg || 'rgba(83,74,183,0.15)' }}>
            <div className="ticket-num">#{event?.sold ? event.sold + 1 : 157}</div>
            <div className="ticket-event-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}><EventIcon size={36} color={event?.color || '#534AB7'} /></div>
            <div className="ticket-event-name">{event?.name || 'Noche de Jazz — CDMX'}</div>
            <div className="ticket-event-meta">{event?.date} · {event?.venue}</div>
          </div>
          
          {/* Separador visual perforado (Boleto físico) */}
          <div className="ticket-divider">
            <div className="ticket-cut ticket-cut-left"></div>
            <div className="ticket-dash"></div>
            <div className="ticket-cut ticket-cut-right"></div>
          </div>
          
          <div className="qr-section">
            <div className="qr-label" style={{ color: labelColor }}>{labelText}</div>
            <div className="qr-outer">
              <div className="qr-grid">
                {currentPattern.map((v, i) => (
                  <div key={i} className="qc" style={{ background: v ? '#111' : '#fff' }}></div>
                ))}
              </div>
              <div className="qr-logo">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.5" fill="#fff"/><rect x="9" y="2" width="5" height="5" rx="1.5" fill="#fff" opacity=".7"/><rect x="2" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".7"/><rect x="9" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".4"/></svg>
              </div>
              {/* Overlay de destello al recargar el QR */}
              <div className={`refresh-flash ${flash ? 'show' : ''}`}></div>
            </div>
          </div>
          
          {/* Barra de progreso de seguridad (Se vacía y recarga cada 30 seg) */}
          <div className="timer-section">
            <div className="timer-bar-wrap">
              <div className="timer-bar" style={{ width: `${pct}%`, background: barColor }}></div>
            </div>
            <div className="timer-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="timer-dot" style={{ background: dotColor }}></div>
                <span className="timer-txt">Se renueva en</span>
                <span className="timer-secs" style={{ color: barColor }}>{secs}s</span>
              </div>
              <span className="rotate-badge">rotado {rotations} {rotations === 1 ? 'vez' : 'veces'}</span>
            </div>
          </div>
          
          <div className="ticket-divider">
            <div className="ticket-cut ticket-cut-left"></div>
            <div className="ticket-dash"></div>
            <div className="ticket-cut ticket-cut-right"></div>
          </div>
          
          {/* Metadatos en Blockchain */}
          <div className="ticket-footer">
            <div className="tf-row"><span className="tf-label">NFT mint</span><span className="tf-value">FiEs7pKm…3xK9</span></div>
            <div className="tf-row"><span className="tf-label">Colección</span><span className="tf-value tf-value-purple">Jazz CDMX · Metaplex Core</span></div>
            <div className="tf-row"><span className="tf-label">Red</span><span className="tf-value">Solana devnet</span></div>
          </div>
        </div>

        {/* Acciones del comprador (Usa el Ticket Digital a la entrada, paga con la Wallet adentro) */}
        <div className="action-row">
          <button className="act-btn act-btn-primary" onClick={() => alert("Dirigiendo a Mi wallet (vista intra-evento)...")}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.2"/><circle cx="9" cy="7" r="1" fill="currentColor"/></svg>
            Mi wallet
          </button>
          <button className="act-btn" onClick={handleShare}>
            {copied ? (
              <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Copiado</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="11" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4.4 6.2l5.1-2.7M4.4 7.8l5.1 2.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> Compartir</>
            )}
          </button>
          <button className="act-btn" onClick={() => alert("Mostrando vista de Verificación on-chain...")}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 3h3l-2.5 2 1 3L7 7.5 4 9l1-3L2.5 4h3z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
            Verificar
          </button>
        </div>

        {/* Features asociadas al ticket */}
        <div className="features-row">
          <div className="feat">
            <div className="feat-icon" style={{ display: 'flex', justifyContent: 'center' }}><Icons.CreditCard size={18} color="#5DCAA5" /></div>
            <div className="feat-label">Pagos en evento</div>
          </div>
          <div className="feat">
            <div className="feat-icon" style={{ display: 'flex', justifyContent: 'center' }}><Icons.Medal size={18} color="#FAC775" /></div>
            <div className="feat-label">POAP al salir</div>
          </div>
          <div className="feat">
            <div className="feat-icon" style={{ display: 'flex', justifyContent: 'center' }}><Icons.Map size={18} color="#7F77DD" /></div>
            <div className="feat-label">Mapa del venue</div>
          </div>
        </div>

        {/* Pulsera NFC Opcional indicación */}
        <div className="nfc-banner">
          <div className="nfc-pulse"></div>
          <div className="nfc-text">Pulsera NFC activa — acerca al lector en la entrada para ingresar sin mostrar el QR</div>
        </div>
      </div>
    </div>
  );
}
