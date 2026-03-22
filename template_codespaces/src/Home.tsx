import { useState } from "react";
import "./Home.css";

const EVENTS = [
  { id:1, icon:'🎵', bg:'#1a1230', name:'Noche de Jazz — CDMX', cat:'Música', date:'Hoy · 21:00 h', venue:'Foro Indie, Roma Norte', price:0.05, total:200, sold:156, badge:'hot', bLabel:'Agotándose' },
  { id:2, icon:'🎨', bg:'#0a1a0a', name:'Expo Diseño Independiente', cat:'Arte', date:'Sáb 29 Mar', venue:'La Ciudadela', price:0, total:300, sold:102, badge:'new', bLabel:'Nuevo' },
  { id:3, icon:'⚽', bg:'#0a0a1e', name:'Torneo Fut 7 — León', cat:'Deporte', date:'Dom 30 Mar · 09:00', venue:'Unidad Deportiva', price:0.02, total:40, sold:38, badge:'hot', bLabel:'Casi lleno' },
  { id:4, icon:'🎤', bg:'#1a0a0a', name:'Open Mic Comedia', cat:'Teatro', date:'Vie 28 Mar · 20:00', venue:'El Rincón Cultural', price:0.03, total:80, sold:45, badge:'new', bLabel:'Nuevo' },
  { id:5, icon:'🌮', bg:'#1a1000', name:'Feria Gastronómica LATAM', cat:'Feria', date:'Sáb 29 Mar · 11:00', venue:'Parque México', price:0, total:500, sold:280, badge:'', bLabel:'' },
  { id:6, icon:'🎸', bg:'#1a0a1a', name:'Rock en tu Idioma Fest', cat:'Música', date:'Dom 30 Mar · 18:00', venue:'Foro Sol', price:0.08, total:150, sold:150, badge:'sold', bLabel:'Agotado' },
];

export default function Home({ onGoToOrganizer }: { onGoToOrganizer: () => void }) {
  const [walletOn, setWalletOn] = useState(false);
  const [catFilter, setCatFilter] = useState('Todos');
  const [selectedEvent, setSelectedEvent] = useState<typeof EVENTS[0] | null>(null);
  const [qty, setQty] = useState(1);
  const [buyStatus, setBuyStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const filteredEvents = catFilter === 'Todos' ? EVENTS : EVENTS.filter(e => e.cat === catFilter);

  const toggleWallet = () => setWalletOn(!walletOn);

  const openModal = (e: typeof EVENTS[0]) => {
    setSelectedEvent(e);
    setQty(1);
    setBuyStatus('idle');
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setBuyStatus('idle');
  };

  const chQty = (d: number) => {
    if (!selectedEvent) return;
    const avail = selectedEvent.total - selectedEvent.sold;
    setQty(prev => Math.max(1, Math.min(Math.min(4, avail), prev + d)));
  };

  const doBuy = () => {
    if (!walletOn && selectedEvent?.price && selectedEvent.price > 0) {
      alert("Conecta tu wallet primero"); // Simulación sencilla en vez del rojo del DOM (por simplicidad de React)
      return;
    }
    setBuyStatus('processing');
    setTimeout(() => {
      setBuyStatus('success');
    }, 2200);
  };

  return (
    <div className="app-home">
      {/* Navbar Superior */}
      <div className="nav">
        <div className="nav-brand">
          <div className="nav-logo">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.5" fill="#fff"/><rect x="9" y="2" width="5" height="5" rx="1.5" fill="#fff" opacity=".7"/><rect x="2" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".7"/><rect x="9" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".4"/></svg>
          </div>
          <span className="nav-name">Mintpass</span>
        </div>
        <div className="nav-links">
          <span className="nav-link">Explorar</span>
          <span className="nav-link">Mis tickets</span>
          <span className="nav-link">Organizadores</span>
        </div>
        <div className="nav-right">
          <div className="btn-wallet" onClick={toggleWallet} style={{ borderColor: walletOn ? '#534AB7' : '' }}>
            <div className="wallet-dot" style={{ background: walletOn ? '#5DCAA5' : '#534AB7' }}></div>
            <span>{walletOn ? '7xKf…9pQm' : 'Conectar wallet'}</span>
          </div>
          <div className="btn-cta" onClick={onGoToOrganizer}>Crear evento</div>
        </div>
      </div>

      {/* Hero Header */}
      <div className="hero">
        <div className="hero-bg"><div className="hero-glow"></div></div>
        <div className="hero-tag"><div className="tag-dot"></div>Powered by Solana · Anti-fraude · Sin reventa</div>
        <div className="hero-title">Tickets <span>NFT</span> para<br/>eventos en LATAM</div>
        <div className="hero-sub">Compra tu entrada, entra con QR verificado on-chain y llévate un coleccionable de cada experiencia.</div>
        <div className="hero-btns">
          <button className="hbtn-main" onClick={() => document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth' })}>Ver eventos</button>
          <button className="hbtn-sec" onClick={onGoToOrganizer}>Soy organizador</button>
        </div>
        <div className="hero-stats">
          <div className="hs"><div className="hs-val">12</div><div className="hs-lbl">Eventos activos</div></div>
          <div className="hs"><div className="hs-val">1,284</div><div className="hs-lbl">NFTs minteados</div></div>
          <div className="hs"><div className="hs-val" style={{color:'#5DCAA5'}}>0%</div><div className="hs-lbl">Fraude registrado</div></div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="features">
        <div className="feat">
          <div className="feat-icon" style={{background:'#12122a'}}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="#7F77DD" strokeWidth="1.2"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="#7F77DD" strokeWidth="1.2" opacity=".5"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="#7F77DD" strokeWidth="1.2" opacity=".5"/><rect x="11" y="11" width="2" height="5" rx=".5" fill="#7F77DD"/><rect x="14.5" y="11" width="2" height="2" rx=".5" fill="#7F77DD"/></svg>
          </div>
          <div className="feat-title">QR dinámico anti-fraude</div>
          <div className="feat-desc">El código rota cada 30 segundos. Imposible duplicar por screenshot.</div>
        </div>
        <div className="feat">
          <div className="feat-icon" style={{background:'#0a1a12'}}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="5" width="14" height="10" rx="2" stroke="#5DCAA5" strokeWidth="1.2"/><circle cx="12" cy="10" r="1.5" fill="#5DCAA5"/></svg>
          </div>
          <div className="feat-title">Wallet intra-evento</div>
          <div className="feat-desc">Paga en barras y merch con tu mismo ticket. Sin efectivo ni apps extra.</div>
        </div>
        <div className="feat">
          <div className="feat-icon" style={{background:'#1a0a0a'}}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#F0997B" strokeWidth="1.2"/><path d="M6 9l2 2 4-4" stroke="#F0997B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="feat-title">Verificación instantánea</div>
          <div className="feat-desc">El staff escanea y en 2 segundos sabe si el ticket es válido on-chain.</div>
        </div>
        <div className="feat">
          <div className="feat-icon" style={{background:'#0a1a0a'}}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="7" r="3" stroke="#5DCAA5" strokeWidth="1.2"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#5DCAA5" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </div>
          <div className="feat-title">POAP coleccionable</div>
          <div className="feat-desc">Tu ticket muta en recuerdo NFT al salir. Prueba que estuviste ahí.</div>
        </div>
      </div>

      {/* Events List */}
      <div className="events-section" id="events-section">
        <div className="sec-hdr">
          <span className="sec-title">Eventos disponibles</span>
          <span className="sec-more">Ver todos →</span>
        </div>
        <div className="cats">
          {['Todos', 'Música', 'Arte', 'Deporte', 'Feria', 'Teatro'].map(c => (
             <div key={c} className={`cat ${catFilter === c ? 'on' : ''}`} onClick={() => setCatFilter(c)}>{c}</div>
          ))}
        </div>
        <div className="events-grid">
          {filteredEvents.map(e => {
            const pct = Math.round((e.sold/e.total)*100);
            const avail = e.total - e.sold;
            const isSold = avail <= 0;
            const barColor = pct > 85 ? '#E24B4A' : pct > 60 ? '#EF9F27' : '#534AB7';
            return (
              <div className="ecard" key={e.id} onClick={() => openModal(e)}>
                <div className="ecard-cover" style={{background: e.bg}}>
                  <span className="ecard-icon">{e.icon}</span>
                  {e.badge && <div className={`ecard-badge b-${e.badge}`}>{e.bLabel}</div>}
                  <div className="nft-chip">NFT</div>
                </div>
                <div className="ecard-body">
                  <div className="ecard-cat">{e.cat}</div>
                  <div className="ecard-name">{e.name}</div>
                  <div className="ecard-meta">{e.date}<br/>{e.venue}</div>
                  <div className="ecard-bar"><div className="ecard-bar-fill" style={{width: `${pct}%`, background: barColor}}></div></div>
                  <div className="ecard-footer">
                    <div className="ecard-price" style={{color: isSold ? '#444' : e.price === 0 ? '#5DCAA5' : '#7F77DD'}}>
                      {isSold ? 'Agotado' : e.price === 0 ? 'Gratis' : e.price + ' SOL'}
                    </div>
                    <div className="ecard-avail">{isSold ? '' : `${avail} disp.`}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Compra/Reserva */}
      {selectedEvent && (
        <div className="modal-wrap">
          <div className="modal-bg" onClick={closeModal}></div>
          <div className="modal">
            {buyStatus === 'idle' && (
              <>
                <div className="modal-cover" style={{background: selectedEvent.bg}}>
                  <span className="modal-icon">{selectedEvent.icon}</span>
                  <button className="modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="modal-cat">{selectedEvent.cat}</div>
                  <div className="modal-name">{selectedEvent.name}</div>
                  <div className="modal-meta">
                    {selectedEvent.date} · {selectedEvent.venue}<br/>
                    {selectedEvent.sold}/{selectedEvent.total} vendidos · {Math.round((selectedEvent.sold/selectedEvent.total)*100)}% del aforo
                  </div>
                  <div className="perks">
                    <div className="perk"><div className="perk-dot"></div>NFT-ticket con QR dinámico anti-fraude</div>
                    <div className="perk"><div className="perk-dot"></div>Wallet intra-evento para barras y merch</div>
                    <div className="perk"><div className="perk-dot"></div>Acceso NFC con pulsera (en puerta)</div>
                    <div className="perk"><div className="perk-dot"></div>POAP coleccionable al terminar el evento</div>
                  </div>
                  {selectedEvent.sold < selectedEvent.total ? (
                    <>
                      <div className="price-section">
                        <div className="price-row">
                          <div>
                            <div className="price-label">Precio por entrada</div>
                            <div className="price-val">{selectedEvent.price === 0 ? 'Gratis' : selectedEvent.price + ' SOL'}</div>
                            {selectedEvent.price > 0 && <div className="price-usd">≈ ${(selectedEvent.price * 96).toFixed(2)} USD</div>}
                          </div>
                        </div>
                        <div className="qty-row">
                          <span className="qty-label">Cantidad</span>
                          <div className="qty-ctrl">
                            <button className="qty-btn" onClick={() => chQty(-1)} disabled={qty <= 1}>−</button>
                            <div className="qty-val">{qty}</div>
                            <button className="qty-btn" onClick={() => chQty(1)} disabled={qty >= 4 || qty >= (selectedEvent.total - selectedEvent.sold)}>+</button>
                          </div>
                        </div>
                      </div>
                      <button className="btn-buy" onClick={doBuy}>
                        {selectedEvent.price === 0 ? 'Reservar entrada gratis' : `Comprar · ${(selectedEvent.price * qty).toFixed(3)} SOL`}
                      </button>
                    </>
                  ) : (
                    <div style={{textAlign: 'center', padding: '20px 0', color: '#444', fontSize: '13px'}}>
                      Este evento está agotado
                    </div>
                  )}
                  <button className="btn-skip" onClick={closeModal}>Cerrar</button>
                </div>
              </>
            )}

            {buyStatus === 'processing' && (
              <div className="proc">
                <div className="proc-ring"></div>
                <div style={{fontSize: '15px', fontWeight: 500, color: '#fff', marginBottom: '6px'}}>Minteando tu NFT-ticket…</div>
                <div style={{fontSize: '12px', color: '#888'}}>Confirmando en Solana devnet</div>
              </div>
            )}

            {buyStatus === 'success' && (
              <div className="succ">
                <div className="succ-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14l5 5 11-10" stroke="#9FE1CB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="succ-title">Entrada confirmada</div>
                <div className="succ-sub">Tu NFT-ticket está en tu wallet<br/>listo para usar en la entrada</div>
                <div className="nft-preview">
                  <div className="nft-lbl">NFT-ticket · Mintpass · Solana devnet</div>
                  <div className="nft-name">{selectedEvent.name} #{selectedEvent.sold + 1}</div>
                  <div className="nft-tags">
                    <div className="nft-tag">{selectedEvent.cat}</div>
                    <div className="nft-tag">QR dinámico</div>
                    <div className="nft-tag">Wallet evento</div>
                    <div className="nft-tag">POAP incluido</div>
                    <div className="nft-tag">Solana devnet</div>
                  </div>
                </div>
                <button className="btn-ver" onClick={() => alert("Mostrando vista de ticket para el comprador...")}>Ver mi ticket y QR</button>
                <button className="btn-volver" onClick={closeModal}>Volver a eventos</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
