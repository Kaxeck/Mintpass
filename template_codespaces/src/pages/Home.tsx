import { useState } from "react";
import * as Icons from "lucide-react";
import "../Home.css";
import { EVENTS } from "../data/events";

export default function Home({ onGoToOrganizer, onEventClick }: { onGoToOrganizer: () => void, onEventClick: (id: number) => void }) {
  const [walletOn, setWalletOn] = useState(false);
  const [catFilter, setCatFilter] = useState('Todos');

  const filteredEvents = catFilter === 'Todos' ? EVENTS : EVENTS.filter(e => e.cat === catFilter);

  const toggleWallet = () => setWalletOn(!walletOn);

  return (
    <div className="app-home">
      {/* ======= FONDO DINÁMICO CON ÍCONOS FLOTANTES ======= */}
      <div className="floating-bg" aria-hidden="true">
        <span className="float-item" style={{ top: '5%', animationDuration: '18s', animationDelay: '0s', fontSize: '28px' }}>⚽</span>
        <span className="float-item" style={{ top: '12%', animationDuration: '22s', animationDelay: '3s', fontSize: '24px' }}>🎵</span>
        <span className="float-item" style={{ top: '20%', animationDuration: '20s', animationDelay: '1s', fontSize: '30px' }}>🎨</span>
        <span className="float-item" style={{ top: '28%', animationDuration: '25s', animationDelay: '5s', fontSize: '22px' }}>🍕</span>
        <span className="float-item" style={{ top: '36%', animationDuration: '19s', animationDelay: '2s', fontSize: '26px' }}>🎸</span>
        <span className="float-item" style={{ top: '44%', animationDuration: '23s', animationDelay: '4s', fontSize: '28px' }}>😂</span>
        <span className="float-item" style={{ top: '52%', animationDuration: '21s', animationDelay: '6s', fontSize: '24px' }}>⚽</span>
        <span className="float-item" style={{ top: '60%', animationDuration: '17s', animationDelay: '1.5s', fontSize: '26px' }}>🎤</span>
        <span className="float-item" style={{ top: '68%', animationDuration: '24s', animationDelay: '3.5s', fontSize: '22px' }}>🖌️</span>
        <span className="float-item" style={{ top: '8%', animationDuration: '26s', animationDelay: '7s', fontSize: '20px' }}>🌮</span>
        <span className="float-item" style={{ top: '25%', animationDuration: '20s', animationDelay: '8s', fontSize: '24px' }}>🎹</span>
        <span className="float-item" style={{ top: '42%', animationDuration: '22s', animationDelay: '9s', fontSize: '26px' }}>🎭</span>
        <span className="float-item" style={{ top: '58%', animationDuration: '18s', animationDelay: '10s', fontSize: '22px' }}>🏈</span>
        <span className="float-item" style={{ top: '75%', animationDuration: '21s', animationDelay: '11s', fontSize: '28px' }}>🎶</span>
        <span className="float-item" style={{ top: '82%', animationDuration: '25s', animationDelay: '12s', fontSize: '20px' }}>🎪</span>
        <span className="float-item" style={{ top: '48%', animationDuration: '19s', animationDelay: '6.5s', fontSize: '24px' }}>🍿</span>
        <span className="float-item" style={{ top: '90%', animationDuration: '23s', animationDelay: '13s', fontSize: '22px' }}>🎺</span>
        <span className="float-item" style={{ top: '15%', animationDuration: '20s', animationDelay: '14s', fontSize: '26px' }}>🤣</span>
      </div>

      {/* Navbar Superior */}
      <div className="nav">
        <div className="nav-brand">
          <div className="nav-logo">
            <Icons.Layers size={20} color="#fff" />
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
      </div>

      {/* Features Grid */}
      <div className="features">
        <div className="feat">
          <div className="feat-icon" style={{background:'rgba(59,130,246,0.1)', border: '0.5px solid rgba(59,130,246,0.2)'}}>
            <Icons.QrCode size={18} color="#60A5FA" />
          </div>
          <div className="feat-title">QR dinámico anti-fraude</div>
          <div className="feat-desc">El código rota cada 30 segundos. Imposible duplicar por screenshot.</div>
        </div>
        <div className="feat">
          <div className="feat-icon" style={{background:'rgba(29,158,117,0.1)', border: '0.5px solid rgba(29,158,117,0.2)'}}>
            <Icons.Wallet size={18} color="#5DCAA5" />
          </div>
          <div className="feat-title">Wallet intra-evento</div>
          <div className="feat-desc">Paga en barras y merch con tu mismo ticket. Sin efectivo ni apps extra.</div>
        </div>
        <div className="feat">
          <div className="feat-icon" style={{background:'rgba(240,153,123,0.1)', border: '0.5px solid rgba(240,153,123,0.2)'}}>
            <Icons.CheckCircle size={18} color="#F0997B" />
          </div>
          <div className="feat-title">Verificación instantánea</div>
          <div className="feat-desc">El staff escanea y en 2 segundos sabe si el ticket es válido on-chain.</div>
        </div>
        <div className="feat">
          <div className="feat-icon" style={{background:'rgba(232,121,168,0.1)', border: '0.5px solid rgba(232,121,168,0.2)'}}>
            <Icons.Medal size={18} color="#E879A8" />
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
            const EventIcon = (Icons as any)[e.icon] || Icons.HelpCircle;
            return (
              <div className="ecard" key={e.id} onClick={() => onEventClick(e.id)}>
                <div className="ecard-cover" style={{background: e.bg}}>
                  <span className="ecard-icon" style={{ display: 'flex' }}><EventIcon size={32} color={e.color} /></span>
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
