import { useState, useEffect } from "react";

export default function EventDetails({ onBack, onGoToStaff }: { onBack: () => void, onGoToStaff: () => void }) {
  // Estado para la simulación de ventas
  const [sold, setSold] = useState(156);
  // Estado para la simulación de check-ins
  const [checked, setChecked] = useState(97);
  // Estado para controlar el mensaje de link copiado
  const [copied, setCopied] = useState(false);

  // Hook useEffect para simular el comportamiento de ventas y check-ins en tiempo real (Mockup)
  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.random();
      // 40% de probabilidad de que se venda un ticket nuevo, tope 200
      if (r > 0.6) {
        setSold(s => {
          const newSold = s < 200 ? s + 1 : s;
          // Sub-probabilidad para que alguien haga check-in
          if (r > 0.7) {
            setChecked(c => (c < newSold ? c + 1 : c));
          }
          return newSold;
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Función para simular el copiado del enlace Blink
  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cálculo del porcentaje de aforo completado
  const pct = Math.round((sold / 200) * 100);

  // Matriz de ejemplo para renderizar un QR falso usando celdas de grid
  const qrPattern = [
    1,1,1,1,1,1,0,
    1,0,0,0,0,1,0,
    1,0,1,1,0,1,1,
    1,0,0,1,0,0,1,
    1,0,1,0,1,1,0,
    1,1,1,1,1,1,1,
    0,1,0,1,0,1,0,
  ];

  return (
    <div className="app">
      {/* ======= NAVBAR SECUNDARIO ======= */}
      <div className="navbar" style={{ justifyContent: 'flex-start', gap: '10px' }}>
        <div className="nav-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <span className="nav-title">Noche de Jazz — CDMX</span>
        <span className="status-pill s-active"><span className="live-dot"></span>En curso</span>
      </div>

      {/* ======= CONTENEDOR PRINCIPAL ======= */}
      <div className="main event-details-main">
        {/* Lado izquierdo: Información del detalle del evento */}
        <div>
          <div className="card">
            
            {/* Cabecera visual del evento (Banner) */}
            <div className="event-hero">
              <div className="hero-inner">
                <span className="hero-icon">🎵</span>
                <div style={{fontSize: '11px', color: '#AFA9EC'}}>imagen del evento</div>
              </div>
              <div className="hero-badge">
                <span className="status-pill s-active"><span className="live-dot"></span>En curso</span>
              </div>
            </div>

            {/* Metadatos principales del evento */}
            <div className="card-section">
              <div className="event-title">Noche de Jazz — CDMX</div>
              <div className="event-meta-row">
                <span>Hoy · 21:00 h</span>
                <span className="meta-dot"></span>
                <span>Foro Indie, Roma Norte</span>
              </div>
              <div className="event-meta-row">
                <span>Música / Concierto</span>
                <span className="meta-dot"></span>
                <span>0.05 SOL por entrada</span>
              </div>
            </div>

            {/* Estadísticas de venta en tiempo real */}
            <div className="card-section">
              <div className="sec-label">Ventas en tiempo real</div>
              <div className="stats-row">
                <div className="stat">
                  <div className="stat-val">{sold}</div>
                  <div className="stat-lbl">Vendidos</div>
                </div>
                <div className="stat">
                  <div className="stat-val">{checked}</div>
                  <div className="stat-lbl">Escaneados</div>
                </div>
                <div className="stat">
                  <div className="stat-val">{200 - sold}</div>
                  <div className="stat-lbl">Disponibles</div>
                </div>
              </div>
              <div className="progress-wrap">
                <div className="progress-header">
                  <span>Aforo</span>
                  <span>{pct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Sección de enlace Blink */}
            <div className="card-section">
              <div className="sec-label">Link Blink para compartir</div>
              <div className="blink-box">
                <div className="blink-url">fiestia.app/e/noche-jazz-cdmx-3xK7f9</div>
                <div className="btn-row">
                  <button className="btn-sm" onClick={handleCopy}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1"/><path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1"/></svg>
                    Copiar link
                  </button>
                  <button className="btn-sm btn-teal" onClick={() => alert("Mostrando detalle Blink de compra...")}>Ver Blink ↗</button>
                  <button className="btn-sm">Compartir</button>
                </div>
                {copied && <div className="copied-msg" style={{display: 'block'}}>Link copiado al portapapeles</div>}
              </div>
            </div>

            {/* Sección del código QR simulado para imprimir */}
            <div className="card-section">
              <div className="sec-label">QR para imprimir</div>
              <div className="qr-wrap">
                <div className="qr-mock">
                  {qrPattern.map((v, i) => (
                    <div key={i} className="qr-cell" style={{ background: v ? 'var(--color-text-primary)' : 'transparent' }}></div>
                  ))}
                </div>
              </div>
              <div className="btn-row" style={{justifyContent: 'center'}}>
                <button className="btn-sm">Descargar PNG</button>
                <button className="btn-sm">Descargar SVG</button>
              </div>
              <div style={{fontSize: '11px', color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: '8px'}}>
                Este QR apunta al Blink de compra — colócalo en tu flyer físico
              </div>
            </div>

            {/* Listado de las compras más recientes */}
            <div className="card-section">
              <div className="sec-label" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <span>Últimas compras</span>
                <span style={{fontSize: '11px', color: 'var(--color-text-tertiary)', cursor: 'pointer'}}>Ver todas</span>
              </div>
              <div className="attendee-list">
                <div className="attendee-row">
                  <div className="av av-p">AK</div>
                  <div className="attendee-addr">7xKf…9pQm</div>
                  <div className="attendee-time">hace 3 min</div>
                  <span className="checked-badge">Ingresó</span>
                </div>
                <div className="attendee-row">
                  <div className="av av-t">RL</div>
                  <div className="attendee-addr">3mTv…2nLs</div>
                  <div className="attendee-time">hace 11 min</div>
                  <span className="checked-badge">Ingresó</span>
                </div>
                <div className="attendee-row">
                  <div className="av av-c">MP</div>
                  <div className="attendee-addr">9bWx…4kRd</div>
                  <div className="attendee-time">hace 18 min</div>
                  <span className="pending-badge">No llegó</span>
                </div>
                <div className="attendee-row">
                  <div className="av av-p">SG</div>
                  <div className="attendee-addr">1nPq…7cYe</div>
                  <div className="attendee-time">hace 24 min</div>
                  <span className="checked-badge">Ingresó</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Lado derecho: Sidebar de acciones rápidas */}
        <div className="sidebar">
          
          {/* Tarjeta de acciones principales */}
          <div className="action-card">
            <div className="action-title">Acciones del evento</div>
            
            <button className="action-btn" onClick={onGoToStaff}>
              <div className="action-icon ai-purple">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="4" height="4" rx="1" stroke="#534AB7" strokeWidth="1.2"/><rect x="8" y="2" width="4" height="4" rx="1" stroke="#534AB7" strokeWidth="1.2"/><rect x="2" y="8" width="4" height="4" rx="1" stroke="#534AB7" strokeWidth="1.2"/><rect x="8" y="9" width="1.5" height="3" rx=".5" fill="#534AB7"/><rect x="10.5" y="9" width="1.5" height="1.5" rx=".5" fill="#534AB7"/></svg>
              </div>
              <div className="action-label">
                <div style={{fontSize: '13px'}}>Panel de staff</div>
                <div className="action-sub">Verificar entradas en puerta</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="var(--color-text-tertiary)" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
            
            <button className="action-btn" onClick={() => alert("Mostrando vista Wallet intra-evento...")}>
              <div className="action-icon ai-teal">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="2" stroke="#0F6E56" strokeWidth="1.2"/><path d="M9 7a1 1 0 110 2 1 1 0 010-2z" fill="#0F6E56"/></svg>
              </div>
              <div className="action-label">
                <div style={{fontSize: '13px'}}>Wallet intra-evento</div>
                <div className="action-sub">Pagos en barras y merch</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="var(--color-text-tertiary)" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
            
            <button className="action-btn" onClick={() => alert("Mostrando vista Generar POAPs...")}>
              <div className="action-icon ai-amber">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#854F0B" strokeWidth="1.2"/><path d="M5 7l1.5 1.5L9 5.5" stroke="#854F0B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="action-label">
                <div style={{fontSize: '13px'}}>Generar POAPs</div>
                <div className="action-sub">Mutar tickets al terminar</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="var(--color-text-tertiary)" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
            
            <button className="action-btn" style={{marginTop: '4px', borderColor: 'var(--color-border-tertiary)'}} onClick={() => alert("Redirigiendo a Editar Evento...")}>
              <div className="action-icon" style={{background: 'var(--color-background-tertiary)'}}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="#5F5E5A" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <div className="action-label">
                <div style={{fontSize: '13px'}}>Editar evento</div>
                <div className="action-sub">Cambiar info o aforo</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="var(--color-text-tertiary)" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
            
            <button className="action-btn" style={{color: '#A32D2D', borderColor: 'var(--color-border-tertiary)'}}>
              <div className="action-icon ai-red">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="#A32D2D" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </div>
              <div className="action-label">
                <div style={{fontSize: '13px', color: '#A32D2D'}}>Cancelar evento</div>
                <div className="action-sub" style={{color: '#E24B4A'}}>Devuelve fondos a compradores</div>
              </div>
            </button>
          </div>

          {/* Tarjeta de recaudación y contrato en Blockchain */}
          <div className="card" style={{margin: 0}}>
            <div className="card-section">
              <div className="sec-label">Recaudación estimada</div>
              <div style={{fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)'}}>{(sold * 0.05).toFixed(2)} SOL</div>
              <div style={{fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px'}}>{sold} tickets × 0.05 SOL</div>
              <div style={{fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px'}}>Sin comisiones de plataforma</div>
            </div>
            <div className="card-section">
              <div className="sec-label">Contrato NFT</div>
              <div style={{fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-secondary)', wordBreak: 'break-all', lineHeight: 1.6}}>
                FiEs…7pKm<br/>
                <span style={{color: 'var(--color-text-tertiary)'}}>Metaplex Core · devnet</span>
              </div>
              <button className="btn-sm" style={{marginTop: '8px', fontSize: '11px'}}>Ver en Solana Explorer ↗</button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
