'use client';
import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import QRCode from "react-qr-code";
import { useUmi } from "../../components/providers";
import { publicKey } from "@metaplex-foundation/umi";
import { fetchAsset } from "@metaplex-foundation/mpl-core";
import { mutateToPoap } from "../../lib/metaplex";
import AlertModal, { AlertModalProps } from "../../components/ui/AlertModal";



import { LandingNavBar } from "../../components/layout/LandingNavBar";
import { LandingFooter } from "../../components/layout/LandingFooter";

const PERIOD = 30; // 30 segundos de vigencia del código QR

export default function MyTicket({ event, ticketMint, qrSecret, onBack }: { event: any, ticketMint: string, qrSecret: string, onBack: () => void }) {
  const [secs, setSecs] = useState(PERIOD);
  const [rotations, setRotations] = useState(0);
  const [flash, setFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cryptoPayload, setCryptoPayload] = useState("");
  const [isQrActive, setIsQrActive] = useState(false);
  const [timeToUnlock, setTimeToUnlock] = useState("");
  const [showQr, setShowQr] = useState(false);
  
  const umi = useUmi();
  const [isMutating, setIsMutating] = useState(false);

  const [alertConfig, setAlertConfig] = useState<AlertModalProps>({ 
    isOpen: false, title: '', message: '', type: 'info', 
    onClose: () => setAlertConfig(p => ({...p, isOpen: false})) 
  });

  const showAlert = (title: string, message: string, type: AlertModalProps['type'], actionText?: string, onAction?: () => void) => {
    setAlertConfig(prev => ({ 
      ...prev, isOpen: true, title, message, type, 
      actionText, 
      onAction: onAction ? () => { setAlertConfig(p => ({...p, isOpen: false})); onAction(); } : undefined 
    }));
  };
  
  // Validamos si este boleto ya fue pasado por el escáner del Staff
  const isCheckedIn = (() => {
    if (event?.ticketStatus === 'CHECKED_IN') return true;
    try {
      const checks = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mintpass_demo_checkins') || '[]') : [];
      return checks.includes(ticketMint);
    } catch { return false; }
  })();

  const poapClaimed = isCheckedIn; // El POAP es automático en esta versión

  const [fallbackFolio, setFallbackFolio] = useState<string | null>(null);

  useEffect(() => {
    if (!event?.ticketNumber && ticketMint) {
      const getOnChainName = async () => {
        if (event?.ticketStatus === 'PENDING_ON_CHAIN') return; // No intentar si aún está pendiente
        try {
          const asset = await fetchAsset(umi, publicKey(ticketMint));
          const match = asset.name.match(/#(\d+)$/);
          if (match) {
            setFallbackFolio(`#${parseInt(match[1], 10).toString().padStart(4, '0')}`);
          }
        } catch (e) {
          // Ignorar silenciosamente si no se encuentra (suele pasar si el RPC va lento)
        }
      };
      getOnChainName();
    }
  }, [event?.ticketNumber, ticketMint, umi]);

  const parsedZones = event?.zones || [];
  const zoneName = parsedZones[event?.ticketZoneIndex || 0]?.name || "General";
  const folioStr = event?.ticketNumber 
    ? `#${event.ticketNumber.toString().padStart(4, '0')}` 
    : (fallbackFolio ? fallbackFolio : (ticketMint ? `#${ticketMint.substring(0, 5).toUpperCase()}` : "#0001"));

  const ticketData = {
    name: event?.name || "Evento Desconocido",
    date: `${event?.date || ''} · ${event?.time || ''}${event?.venue && event.venue !== event?.name ? ` · ${event.venue}` : ''}`,
    zone: zoneName,
    folio: folioStr,
    gate: undefined,
    row: event?.ticketRow,
    seat: event?.ticketSeat,
    isSoulbound: event?.isSoulbound || false,
    allowResale: event?.allowResale !== undefined ? event.allowResale : true,
    resaleCapLimit: event?.resaleCapLimit,
    allowRefunds: event?.allowRefunds || false,
    refundTimeLimit: event?.refundTimeLimit,
    organizer: event?.organizerName || "Organizador Independiente",
    reputation: event?.organizerReputation || 100,
    eventsCompleted: event?.organizerEvents || 1,
    buyerWallet: event?.buyerWallet || null
  };

  // Mutation logic has been moved to the server side (automatically triggered on check-in)

  const handleRefund = () => {
    showAlert(
      "Solicitar Devolución al Contrato",
      "La política del evento permite devoluciones automáticas on-chain.\n\nEl Smart Contract destruirá (burn) tu NFT y liberará los fondos a tu wallet.\n\nNota: Los costos de servicio de Mintpass (aprox. 3%) no son reembolsables.\n\n¿Proceder con la devolución?",
      "warning",
      "Firmar y Devolver",
      () => {
        // En un caso real llamaríamos a la instrucción escrow_refund de Solana
        setIsMutating(true);
        setTimeout(() => {
          setIsMutating(false);
          showAlert("Devolución Exitosa", "Tu NFT ha sido destruido y los fondos fueron transferidos de vuelta a tu wallet (excluyendo tarifa de servicio).", "success");
          // Para la demo, simplemente redirigir o marcar como devuelto
          setTimeout(() => onBack(), 3000);
        }, 1500);
      }
    );
  };

  async function generateHash(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  useEffect(() => {
    window.scrollTo(0, 0); 
    let currentPayloadTs = Date.now();

    const generatePayload = async (ts: number) => {
      const hash = await generateHash(`${ticketMint}${ts}${qrSecret}`);
      setCryptoPayload(JSON.stringify({ mint: ticketMint, timestamp: ts, hash }));
    };
    
    // Initial generation
    generatePayload(currentPayloadTs);

    const interval = setInterval(async () => {
      // 1. Time lock logic
      const eventDate = new Date(`${event?.date}T${event?.time}`);
      const now = new Date();
      if (!isNaN(eventDate.getTime())) {
        const diffMs = eventDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours > 1) {
          setIsQrActive(false);
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setTimeToUnlock(`${hours}h ${mins}m`);
        } else {
          setIsQrActive(true);
        }
      } else {
        setIsQrActive(true);
      }

      // 2. TOTP logic
      setSecs(prev => {
        if (prev <= 1) {
          setFlash(true);
          setTimeout(() => setFlash(false), 200);
          setRotations(r => r + 1);
          currentPayloadTs = Date.now();
          generatePayload(currentPayloadTs);
          return PERIOD; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [event?.date, event?.time, ticketMint, qrSecret]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      // Compartimos el enlace público del evento para invitar amigos, no el boleto privado
      const eventUrl = `${window.location.origin}/purchase/${event?.id}`;
      navigator.clipboard.writeText(eventUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }).catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
    }
  };

  const handleAddToWallet = () => {
    showAlert("Agregar a Wallet", "Esta función generará un archivo .pkpass para Apple Wallet o Google Wallet en la versión final.", "info");
  };

  const shortMint = ticketMint.length > 10 ? `${ticketMint.slice(0,4)}…${ticketMint.slice(-4)}` : ticketMint;

  const eventImage = event?.coverImage || 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=400';
  
  const ticketImage = poapClaimed 
    ? `https://api.dicebear.com/7.x/shapes/svg?seed=${ticketMint}`
    : (event?.ticketImage || eventImage);

  const showQrSection = showQr || isCheckedIn || poapClaimed || event?.status === 'CANCELLED' || event?.ticketStatus === 'CANCELLED';

  return (
    <div className="lp-container">
      <LandingNavBar />
      
      <div className="lp-content">
        <div className="mt-container">
          <button onClick={onBack} className="mt-back-btn">
            <Icons.ArrowLeft size={16} /> Volver a Mis boletos
          </button>

          <div className="mt-card" style={{ overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '220px', 
                backgroundImage: `url('${eventImage}')`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                position: 'relative'
              }}
            >
              <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                {event?.status === 'CANCELLED' || event?.ticketStatus === 'CANCELLED' ? (
                   <span className="mt-badge-status cancelled" style={{ position: 'static' }}>Cancelado</span>
                ) : event?.ticketStatus === 'PENDING_ON_CHAIN' ? (
                   <span className="mt-badge-status" style={{ background: '#FEF3C7', color: '#92400E', position: 'static' }}>Pendiente On-Chain</span>
                ) : poapClaimed ? (
                   <span className="mt-badge-status poap" style={{ position: 'static' }}>Coleccionable POAP</span>
                ) : (
                   <span className="mt-badge-status" style={{ position: 'static' }}>Activo</span>
                )}
              </div>
            </div>

            <div className="mt-content" style={{ paddingTop: '24px' }}>
              <div className="mt-hero" style={{ marginTop: 0, overflow: 'hidden' }}>
                
                {/* QR Section (Underneath the ticket sheet) */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center' }}>
                  <div className={`mt-qr-ring ${event?.status === 'CANCELLED' || event?.ticketStatus === 'CANCELLED' || isCheckedIn ? 'used' : ''} ${poapClaimed ? 'poap' : ''} ${!isQrActive && !poapClaimed && !isCheckedIn && event?.status !== 'CANCELLED' && event?.ticketStatus !== 'CANCELLED' ? 'locked' : ''}`}>
                    <div className="mt-qr-box">
                      {event?.status === 'CANCELLED' || event?.ticketStatus === 'CANCELLED' ? (
                        <div className="mt-qr-state mt-qr-cancelled">
                          <Icons.XCircle size={48} strokeWidth={1.5} />
                          <span>Boleto<br/>Cancelado</span>
                        </div>
                      ) : event?.ticketStatus === 'PENDING_ON_CHAIN' ? (
                        <div className="mt-qr-state mt-qr-locked">
                          <Icons.Clock size={48} strokeWidth={1.5} />
                          <span>Confirmando<br/>en Solana...</span>
                        </div>
                      ) : poapClaimed ? (
                        <>
                          <Icons.ShieldCheck size={64} color="#14F195" />
                          <span>¡Validado Exitosamente!</span>
                          <span style={{ fontSize: '11px', marginTop: '4px', color: '#5F5E5A' }}>Tu POAP se ha generado</span>
                        </>
                      ) : !isQrActive ? (
                        <div className="mt-qr-state mt-qr-locked">
                          <Icons.Lock size={48} strokeWidth={1.5} />
                          <span>Bloqueado temporalmente</span>
                        </div>
                      ) : (
                        <QRCode value={cryptoPayload} size={120} bgColor="#ffffff" fgColor="#111111" />
                      )}
                      {!isCheckedIn && !poapClaimed && isQrActive && event?.status !== 'CANCELLED' && <div className={`mt-flash ${flash ? 'show' : ''}`}></div>}
                    </div>
                  </div>

                  {!isCheckedIn && !poapClaimed && event?.status !== 'CANCELLED' && (
                    <>
                      {isQrActive ? (
                        <p className="mt-timer">Se renueva en <span>{secs}s</span></p>
                      ) : (
                        <p className="mt-timer mt-timer-locked">Se revelará en {timeToUnlock}</p>
                      )}
                      <p className="mt-warning">Imposible de capturar en pantalla</p>
                    </>
                  )}
                  {poapClaimed && <p className="mt-warning">Registrado permanentemente off-chain</p>}
                </div>

                {/* Animated Ticket Image Sheet (On top) */}
                <div 
                  className={`mt-ticket-sheet ${showQrSection ? 'peeled' : ''}`}
                  style={{ backgroundImage: `url('${ticketImage}')` }}
                >
                  <div className="mt-ticket-sheet-overlay"></div>
                </div>

                {/* Action Button (Always on top) */}
                <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', zIndex: 20 }}>
                  {!poapClaimed && !isCheckedIn && event?.status !== 'CANCELLED' && event?.ticketStatus !== 'CANCELLED' && (
                    <button 
                      onClick={() => {
                        if (event?.ticketStatus === 'PENDING_ON_CHAIN') {
                          showAlert("Confirmando en Solana", "Tu boleto está siendo validado en la blockchain. El código QR estará disponible en unos instantes una vez que la red confirme la transacción.", "info");
                          return;
                        }
                        setShowQr(!showQr);
                      }}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: showQr ? '#F4F4F5' : '#14F195',
                        color: showQr ? '#1E1E1E' : '#000000',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                      }}
                    >
                      {showQr ? <Icons.EyeOff size={18} /> : <Icons.QrCode size={18} />}
                      {showQr ? 'Ocultar código de acceso' : 'Mostrar código de acceso'}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-details">
                <p className="mt-title">{ticketData.name}</p>
                <p className="mt-subtitle">{ticketData.date}</p>

                <div className="mt-info-grid">
                  <div className="mt-info-box">
                    <p className="mt-info-label">Zona</p>
                    <p className="mt-info-value">{ticketData.zone}</p>
                  </div>
                  {ticketData.gate && (
                    <div className="mt-info-box">
                      <p className="mt-info-label">Acceso</p>
                      <p className="mt-info-value">{ticketData.gate}</p>
                    </div>
                  )}
                  {ticketData.row && ticketData.seat && (
                    <div className="mt-info-box">
                      <p className="mt-info-label">Asiento</p>
                      <p className="mt-info-value">F{ticketData.row}-{ticketData.seat}</p>
                    </div>
                  )}
                  <div className="mt-info-box">
                    <p className="mt-info-label">Folio</p>
                    <p className="mt-info-value">{ticketData.folio}</p>
                  </div>
                  <div className="mt-info-box">
                    <p className="mt-info-label">Wallet</p>
                    <p className="mt-info-value">
                      {ticketData.buyerWallet 
                        ? (ticketData.buyerWallet.length > 10 ? `${ticketData.buyerWallet.slice(0,4)}…${ticketData.buyerWallet.slice(-4)}` : ticketData.buyerWallet) 
                        : shortMint}
                    </p>
                  </div>
                </div>

                <div className="mt-verify">
                  <div className="mt-verify-icon">✓</div>
                  <div>
                    <p className="mt-verify-title">Verificado on-chain en Solana</p>
                    <a href={`https://explorer.solana.com/address/${ticketMint}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="mt-verify-link" style={{ textDecoration: 'none' }}>Ver estado en el explorador →</a>
                  </div>
                </div>

                <div className="mt-actions-row">
                  <button className="mt-btn mt-btn-primary" onClick={handleAddToWallet}>Agregar a wallet</button>
                  <button className="mt-btn mt-btn-secondary" onClick={handleShare}>
                    {copied ? '¡Copiado!' : 'Compartir'}
                  </button>
                </div>

                {ticketData.isSoulbound ? (
                  <div className="mt-soulbound-warn">
                    <Icons.ShieldAlert size={16} /> Ticket Intransferible (Soulbound)
                  </div>
                ) : (
                  <button 
                    className="mt-btn-outline" 
                    disabled={!ticketData.allowResale || isCheckedIn || poapClaimed}
                    title={!ticketData.allowResale ? 'El organizador deshabilitó la reventa' : ''}
                  >
                    {ticketData.allowResale ? 'Iniciar reventa oficial' : 'Reventa no permitida'}
                  </button>
                )}

                {ticketData.allowResale && ticketData.resaleCapLimit && !ticketData.isSoulbound && (
                  <p style={{fontSize: '11px', color: '#5F5E5A', textAlign: 'center', marginTop: '-12px', marginBottom: '18px'}}>
                    Tope máximo de reventa: ${ticketData.resaleCapLimit}
                  </p>
                )}

                {ticketData.allowRefunds && !isCheckedIn && !poapClaimed && (
                  <div style={{ marginTop: ticketData.allowResale ? '0' : '18px', marginBottom: '18px' }}>
                    <button 
                      onClick={handleRefund}
                      disabled={isMutating}
                      className="mt-btn-outline"
                      style={{ borderColor: '#F59E0B', color: '#B45309', marginBottom: '4px' }}
                    >
                      <Icons.Undo2 size={16} /> Solicitar Devolución
                    </button>
                    <p style={{fontSize: '11px', color: '#5F5E5A', textAlign: 'center', margin: 0}}>
                      Límite: Hasta {ticketData.refundTimeLimit} días antes del evento.<br/>
                      <span style={{ fontSize: '10px' }}>(Costos de servicio no reembolsables)</span>
                    </p>
                  </div>
                )}

                <div className="mt-footer">
                  <div className="mt-footer-avatar"><Icons.Building size={14} color="#5F5E5A" /></div>
                  <div>
                    <p className="mt-footer-name">Organiza: {ticketData.organizer}</p>
                    <p className="mt-footer-rep">Reputación {ticketData.reputation} · {ticketData.eventsCompleted} eventos completados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <LandingFooter />
      <AlertModal {...alertConfig} />
    </div>
  );
}
