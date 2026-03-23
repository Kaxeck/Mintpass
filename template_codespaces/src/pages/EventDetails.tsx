import { useState } from "react";
import * as Icons from "lucide-react";
import PageNav from "../components/PageNav";
import { CreatedEvent } from "./CreateEvent";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { releaseEscrow } from "../lib/escrow";
import AlertModal, { AlertModalProps } from "../components/AlertModal";

export default function EventDetails({ event, stats, ownedTickets = [], onBack, onGoToStaff }: { event: CreatedEvent, stats?: {sold: number, checked: number}, ownedTickets?: Array<{ mint: string, purchaseDate: number, eventId: number }>, onBack: () => void, onGoToStaff: () => void }) {
  const sold = stats?.sold || 0;
  const checked = stats?.checked || 0;
  const [copied, setCopied] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalProps>({ 
    isOpen: false, title: '', message: '', type: 'info', 
    onClose: () => setAlertConfig(p => ({...p, isOpen: false})) 
  });

  const showAlert = (title: string, message: string, type: AlertModalProps['type'], signature?: string) => {
    setAlertConfig(prev => ({ ...prev, isOpen: true, title, message, type, signature }));
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { connection } = useConnection();
  const wallet = useWallet();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawn, setWithdrawn] = useState(() => {
    return localStorage.getItem(`mintpass_withdrawn_${event.id}`) === 'true';
  });

  const handleWithdraw = async () => {
    if (checked < 2) {
      showAlert("Retiro Bloqueado", "Transacción Rechazada por el Contrato Inteligente:\n\nSe requieren al menos 2 validaciones de asistentes escaneados en puerta (check-ins reales on-chain) para liberar los fondos de la bóveda.", "warning");
      return;
    }

    if (event.priceType !== 'sol') {
      showAlert("No Soportado", "Simulación: Pagos en USDC requieren inicializar Cuentas Token (ATA). Se omitirá para evitar colisiones en la demo de SOL.", "info");
      return;
    }

    if (!wallet.publicKey) {
      showAlert("Wallet Desconectada", "Conecta tu wallet principal para autorizar la recepción de los fondos desde el contrato inteligente.", "warning");
      return;
    }

    if (event.organizerWallet && wallet.publicKey.toBase58() !== event.organizerWallet) {
      showAlert("Acceso Denegado", "Solo la wallet que creó legítimamente el evento tiene la autoridad criptográfica para extraer los fondos de la bóveda.", "error");
      return;
    }

    try {
      setIsWithdrawing(true);
      const totalSol = sold * event.price;
      const sig = await releaseEscrow(connection, wallet as any, totalSol);
      localStorage.setItem(`mintpass_withdrawn_${event.id}`, 'true');
      setWithdrawn(true);
      showAlert("¡Retiro Exitoso!", `Los fondos han sido liberados desde el contrato a tu wallet privada.\n\nSe transfirieron ${totalSol} SOL de las ganancias.`, "success", sig);
    } catch (e: any) {
      showAlert("Error de Validación Blockchain", e.message, "error");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const pct = Math.round((sold / (event.aforo || 1)) * 100);

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
      <PageNav 
        onBack={onBack} 
        title={event.name} 
        rightElement={<span className="status-pill s-active"><span className="live-dot"></span>En curso</span>} 
      />

      {/* ======= CONTENEDOR PRINCIPAL ======= */}
      <div className="main event-details-main">
        {/* Lado izquierdo: Información del detalle del evento */}
        <div>
          <div className="card">
            
            {/* Cabecera visual del evento (Banner) */}
            <div className="event-hero">
              <div className="hero-inner" style={{ gap: '6px' }}>
                <span className="hero-icon" style={{ display: 'flex' }}><Icons.Music size={32} color="#534AB7" /></span>
                <div style={{fontSize: '11px', color: '#AFA9EC'}}>imagen del evento</div>
              </div>
              <div className="hero-badge">
                <span className="status-pill s-active"><span className="live-dot"></span>En curso</span>
              </div>
            </div>

            {/* Metadatos principales del evento */}
            <div className="card-section">
              <div className="event-title">{event.name}</div>
              <div className="event-meta-row">
                <span>{event.date} · {event.time} h</span>
                <span className="meta-dot"></span>
                <span>{event.venue}</span>
              </div>
              <div className="event-meta-row">
                <span>{event.category || 'Categoría general'}</span>
                <span className="meta-dot"></span>
                <span>{event.priceType === 'free' ? 'Gratis' : `${event.price} ${event.priceType.toUpperCase()} por entrada`}</span>
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
                  <div className="stat-val">{event.aforo - sold}</div>
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
                  <button className="btn-sm" style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={handleCopy}>
                    <Icons.Copy size={12} />
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
                {ownedTickets.length === 0 ? (
                  <div style={{color: '#666', fontSize: '13px', textAlign: 'center', padding: '16px'}}>0 registros recibidos on-chain</div>
                ) : (
                  ownedTickets.slice().reverse().map((t, idx) => {
                    const diffMins = Math.floor((Date.now() - t.purchaseDate) / 60000);
                    const timeStr = diffMins === 0 ? 'Hace un instante' : diffMins < 60 ? `Hace ${diffMins} min` : `Hace ${Math.floor(diffMins/60)} h`;
                    return (
                      <div className="attendee-row" key={t.mint}>
                        <div className="av av-p">T{(ownedTickets.length - idx).toString().padStart(2, '0')}</div>
                        <div className="attendee-addr">{t.mint.substring(0,6)}...{t.mint.substring(t.mint.length-4)}</div>
                        <div className="attendee-time">{timeStr}</div>
                        <span className="checked-badge">Comprador</span>
                      </div>
                    )
                  })
                )}
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
              <div className="action-icon ai-purple" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Icons.ScanLine size={16} color="#534AB7" />
              </div>
              <div className="action-label">
                <div style={{fontSize: '13px'}}>Panel de staff</div>
                <div className="action-sub">Verificar entradas en puerta</div>
              </div>
              <Icons.ChevronRight size={14} color="var(--color-text-tertiary)" />
            </button>
            
            <button className="action-btn" onClick={() => alert("Mostrando vista Wallet intra-evento...")}>
              <div className="action-icon ai-teal" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Icons.Wallet size={16} color="#0F6E56" />
              </div>
              <div className="action-label">
                <div style={{fontSize: '13px'}}>Wallet intra-evento</div>
                <div className="action-sub">Pagos en barras y merch</div>
              </div>
              <Icons.ChevronRight size={14} color="var(--color-text-tertiary)" />
            </button>
            
            <button className="action-btn" onClick={() => alert("Mostrando panel de distribución masiva de POAPs para los asistentes verificados.")}>
              <div className="action-icon ai-amber" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Icons.Medal size={16} color="#854F0B" />
              </div>
              <div className="action-label">
                <div style={{fontSize: '13px'}}>Generar POAPs</div>
                <div className="action-sub">Mutar tickets masivamente</div>
              </div>
              <Icons.ChevronRight size={14} color="var(--color-text-tertiary)" />
            </button>
            
            <button className="action-btn" style={{marginTop: '4px', borderColor: 'var(--color-border-tertiary)'}} onClick={() => alert("Redirigiendo a Editar Evento...")}>
              <div className="action-icon" style={{background: 'var(--color-background-tertiary)', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <Icons.Pencil size={16} color="#5F5E5A" />
              </div>
              <div className="action-label">
                <div style={{fontSize: '13px'}}>Editar evento</div>
                <div className="action-sub">Cambiar info o aforo</div>
              </div>
              <Icons.ChevronRight size={14} color="var(--color-text-tertiary)" />
            </button>
            
            <button className="action-btn" style={{color: '#A32D2D', borderColor: 'var(--color-border-tertiary)'}}>
              <div className="action-icon ai-red" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Icons.Ban size={16} color="#A32D2D" />
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
              <div style={{fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)'}}>
                {event.priceType === 'free' ? '0' : (sold * event.price).toFixed(2)} {event.priceType.toUpperCase()}
              </div>
              <div style={{fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px'}}>
                {sold} tickets × {event.priceType === 'free' ? '0' : event.price} {event.priceType.toUpperCase()}
              </div>
              <div style={{fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px'}}>Sin comisiones de plataforma</div>

              {/* Botón de Retiro Nativo */}
              <button 
                className={`btn-sm ${checked >= 2 && !withdrawn && !isWithdrawing ? 'btn-teal' : ''}`}
                onClick={handleWithdraw}
                disabled={isWithdrawing || withdrawn}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '10px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (isWithdrawing || withdrawn) ? 0.6 : 1,
                  cursor: (isWithdrawing || withdrawn) ? 'not-allowed' : 'pointer',
                  fontSize: '13px'
                }}
              >
                {isWithdrawing ? (
                  <>
                    <Icons.Loader size={14} className="animate-spin" />
                    Autorizando...
                  </>
                ) : withdrawn ? (
                  <>
                    <Icons.CheckCircle size={14} />
                    Fondos extraídos
                  </>
                ) : (
                  <>
                    {checked >= 2 ? <Icons.ArrowDownToLine size={14} /> : <Icons.Lock size={14} />}
                    Retirar ganancias ({checked}/2 checks)
                  </>
                )}
              </button>
              <div style={{fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '8px', textAlign: 'center'}}>Bóveda auto-custodiable on-chain</div>
            </div>
            <div className="card-section">
              <div className="sec-label">Contrato NFT (On-Chain)</div>
              <div style={{fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-secondary)', wordBreak: 'break-all', lineHeight: 1.6}}>
                {event.collectionMint}<br/>
                <span style={{color: 'var(--color-text-tertiary)'}}>Metaplex Core · devnet</span>
              </div>
              <button className="btn-sm" style={{marginTop: '8px', fontSize: '11px'}} onClick={() => window.open(`https://explorer.solana.com/address/${event.collectionMint}?cluster=devnet`, '_blank')}>Ver en Solana Explorer ↗</button>
            </div>
          </div>
          
        </div>
      </div>
      <AlertModal {...alertConfig} />
    </div>
  );
}
