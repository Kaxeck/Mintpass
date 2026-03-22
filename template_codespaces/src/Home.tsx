import { useState } from "react";
import "./Home.css";
import { EVENTS } from "./data";

export default function Home({ onGoToOrganizer, onEventClick }: { onGoToOrganizer: () => void, onEventClick: (id: number) => void }) {
  const [walletOn, setWalletOn] = useState(false);
  const [catFilter, setCatFilter] = useState('Todos');

  const filteredEvents = catFilter === 'Todos' ? EVENTS : EVENTS.filter(e => e.cat === catFilter);

  const toggleWallet = () => setWalletOn(!walletOn);

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
              <div className="ecard" key={e.id} onClick={() => onEventClick(e.id)}>
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

    </div>
  );
}
