import { useState, useEffect } from "react";
import "./index.css";

// Interface para el evento (coincide con los campos de data.ts)
type EventModel = {
  id: number; icon: string; bg: string; name: string; cat: string;
  date: string; venue: string; duration: string; price: number; total: number; sold: number;
};

export default function BuyerPurchase({ event, onBack, onGoToMyTicket }: { event: EventModel, onBack: () => void, onGoToMyTicket: () => void }) {
  // Manejo de pantallas internas (flujo de compra)
  const [screen, setScreen] = useState<'buy' | 'processing' | 'success'>('buy');
  const [qty, setQty] = useState(1);
  const [wallet, setWallet] = useState<'phantom' | 'backpack' | null>('phantom');
  // Pasos de progreso para la animación de minteo
  const [progressStep, setProgressStep] = useState(0);

  // Mover el scroll hacia arriba al entrar a esta vista
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Cálculos de disponibilidad
  const available = event.total - event.sold;
  const pctSold = Math.round((event.sold / event.total) * 100);

  // Función para manejar la cantidad de entradas
  const changeQty = (delta: number) => {
    setQty(prev => Math.max(1, Math.min(4, Math.min(available, prev + delta))));
  };

  // Iniciar la transición a la pantalla de procesamiento y animar
  const startPurchase = () => {
    setScreen('processing');
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgressStep(step);
      if (step >= 4) {
        clearInterval(interval);
        setTimeout(() => setScreen('success'), 600);
      }
    }, 900);
  };

  return (
    <div className="app">
      {/* ======= HERO DEL EVENTO ======= */}
      <div className="purchase-hero" style={{ background: 'var(--color-background-primary)' }}>
        <div className="navbar" style={{ position: 'absolute', top: 0, width: '100%', zIndex: 10, background: 'transparent', border: 'none' }}>
          <div className="nav-brand">
            <div className="nav-back" onClick={onBack} style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'transparent', color: '#fff' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        <div className="hero-cover" style={{ background: event.bg, height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div className="hero-icon" style={{ fontSize: '64px' }}>{event.icon}</div>
          <div className="hero-gradient" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(transparent, var(--color-background-primary))', pointerEvents: 'none' }}></div>
        </div>
        <div className="hero-body" style={{ padding: '16px 20px 0' }}>
          <div className="hero-cat" style={{ fontSize: '11px', color: '#7F77DD', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>{event.cat} / Experiencia</div>
          <div className="hero-name" style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.2, marginBottom: '10px' }}>{event.name}</div>
          <div className="meta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingBottom: '16px' }}>
            <div className="meta-chip" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1"/><path d="M1 5h10M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
              {event.date}
            </div>
            <div className="meta-chip" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1a3.5 3.5 0 010 7C4 8 1 11 1 11" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/><circle cx="6" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1"/></svg>
              {event.venue}
            </div>
            <div className="meta-chip" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/><path d="M6 3v3l2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
              {event.duration}
            </div>
          </div>
        </div>
      </div>

      {/* ======= ÁREA PRINCIPAL ======= */}
      <div className="main" style={{ maxWidth: '460px' }}>
        
        {/* Barra de Disponibilidad */}
        <div className="avail-bar">
          <div>
            <div className="avail-left">Entradas disponibles</div>
            <div className="avail-pct">{pctSold}% vendido</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="avail-num">{available} restantes</div>
            <div className="avail-track">
              <div className="avail-fill" style={{ width: `${pctSold}%`, background: pctSold > 85 ? '#E24B4A' : '#534AB7' }}></div>
            </div>
          </div>
        </div>

        {/* ======= PANTALLA: COMPRAR ======= */}
        {screen === 'buy' && (
          <div className="screen show">
            <div className="price-card">
              <div className="price-row">
                <div>
                  <div className="price-label">Precio por entrada</div>
                  <div className="price-amount">{event.price === 0 ? 'Gratis' : `${event.price} SOL`}</div>
                  {event.price > 0 && <div className="price-sub">≈ ${(event.price * 96).toFixed(2)} USD</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Cantidad</div>
                  <div className="qty-ctrl" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="qty-btn" onClick={() => changeQty(-1)}>−</div>
                    <div className="qty-val">{qty}</div>
                    <div className="qty-btn" onClick={() => changeQty(1)}>+</div>
                  </div>
                </div>
              </div>
              <div className="total-row">
                <div className="total-label">Total</div>
                <div className="total-amount">{event.price === 0 ? '0 SOL' : `${(qty * event.price).toFixed(3)} SOL`}</div>
              </div>
            </div>

            <div className="perks-card">
              <div className="perks-title">Incluye con tu ticket</div>
              <div className="perk-row"><div className="perk-dot"></div><div className="perk-text">NFT verificable — QR dinámico anti-fraude</div></div>
              <div className="perk-row"><div className="perk-dot"></div><div className="perk-text">Wallet intra-evento para pagos en barras</div></div>
              <div className="perk-row"><div className="perk-dot"></div><div className="perk-text">Acceso NFC con pulsera (en puerta)</div></div>
              <div className="perk-row"><div className="perk-dot"></div><div className="perk-text">POAP coleccionable al terminar el evento</div></div>
            </div>

            <div className="wallet-section">
              <div className="ws-label">Conecta tu wallet para pagar</div>
              <div className="wallet-opts">
                <div className={`wallet-opt ${wallet === 'phantom' ? 'selected' : ''}`} onClick={() => setWallet('phantom')}>
                  <div className="wo-icon" style={{ background: 'rgba(83,74,183,0.15)' }}>👻</div>
                  <div><div className="wo-name">Phantom</div><div className="wo-sub">La más usada en Solana</div></div>
                  <div className="wo-check">{wallet === 'phantom' && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                </div>
                <div className={`wallet-opt ${wallet === 'backpack' ? 'selected' : ''}`} onClick={() => setWallet('backpack')}>
                  <div className="wo-icon" style={{ background: 'rgba(29,158,117,0.15)' }}>🎒</div>
                  <div><div className="wo-name">Backpack</div><div className="wo-sub">xNFT wallet</div></div>
                  <div className="wo-check">{wallet === 'backpack' && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                </div>
              </div>
              <div className="divider-text">— o sin wallet —</div>
              <div className="email-field">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1"/><path d="M1 5l6 4 6-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                <input type="email" placeholder="tu@email.com — recibes el ticket por aquí" />
              </div>
              <div className="hint" style={{ color: 'var(--color-text-secondary)', fontSize: '11px', marginTop: '6px' }}>
                Sin wallet creamos una embedded wallet vinculada a tu email.
              </div>
            </div>

            <button className="btn-buy" onClick={startPurchase} disabled={available <= 0}>
              {available <= 0 ? 'Agotado' : event.price === 0 ? 'Reservar entrada gratis' : `Comprar entrada · ${(qty * event.price).toFixed(3)} SOL`}
            </button>
            <div className="buy-note">Sin comisiones · NFT en tu wallet en segundos · Transacción en Solana devnet</div>
          </div>
        )}

        {/* ======= PANTALLA: PROCESAMIENTO ======= */}
        {screen === 'processing' && (
          <div className="screen show">
            <div className="processing-screen">
              <div className="proc-ring"></div>
              <div className="proc-title">Procesando tu compra</div>
              <div className="proc-sub">Firmando y confirmando en Solana…</div>
              <div className="proc-steps">
                <div className="proc-step">
                  <div className={`ps-dot ${progressStep >= 1 ? 'ps-done' : 'ps-active'}`}></div>
                  <div className="ps-label">Wallet conectada</div>
                </div>
                <div className="proc-step">
                  <div className={`ps-dot ${progressStep >= 2 ? 'ps-done' : progressStep === 1 ? 'ps-active' : 'ps-todo'}`}></div>
                  <div className="ps-label">Transacción firmada</div>
                </div>
                <div className="proc-step">
                  <div className={`ps-dot ${progressStep >= 3 ? 'ps-done' : progressStep === 2 ? 'ps-active' : 'ps-todo'}`}></div>
                  <div className={`ps-label ${progressStep === 2 ? 'ps-active-lbl' : ''}`}>Minteando NFT-ticket…</div>
                </div>
                <div className="proc-step">
                  <div className={`ps-dot ${progressStep >= 4 ? 'ps-done' : progressStep === 3 ? 'ps-active' : 'ps-todo'}`}></div>
                  <div className="ps-label">Confirmación on-chain</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======= PANTALLA: ÉXITO ======= */}
        {screen === 'success' && (
          <div className="screen show">
            <div className="success-screen">
              <div className="success-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 16l5 5 11-10" stroke="#9FE1CB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="success-title">Entrada confirmada</div>
              <div className="success-sub">Tu NFT-ticket está en tu wallet</div>
              
              <div className="nft-card">
                <div className="nft-cover" style={{ background: event.bg }}>{event.icon}</div>
                <div className="nft-body">
                  <div className="nft-label">NFT-ticket · Solana</div>
                  <div className="nft-name">{event.name} #{event.sold + 1}</div>
                  <div className="nft-attrs">
                    <div className="nft-attr">{event.date}</div>
                    <div className="nft-attr">{event.venue}</div>
                    <div className="nft-attr">Acceso general</div>
                    <div className="nft-attr">+ Wallet intra-evento</div>
                    <div className="nft-attr">+ POAP incluido</div>
                  </div>
                  <div className="nft-mint">FiEs7pKm…3xK9 · Metaplex Core · devnet</div>
                </div>
              </div>
              
              <div className="btn-row" style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-half btn-primary" onClick={onGoToMyTicket}>Ver mi QR</button>
                <button className="btn-half btn-secondary" onClick={() => alert("Mostrando Wallet Intra-evento...")}>Mi wallet</button>
              </div>
              <div className="explorer-link" onClick={() => alert("Abriendo Solana Explorer...")}>Ver en Solana Explorer ↗</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
