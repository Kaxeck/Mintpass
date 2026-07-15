'use client';
import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import QRCode from "react-qr-code";
import { useUmi } from "../../providers";
import { mutateToPoap } from "../../lib/metaplex";
import AlertModal, { AlertModalProps } from "../../components/AlertModal";
import "../../Home.css";
import "../../styles/MyTicket.css";

import { LandingNavBar } from "../../components/LandingNavBar";
import { LandingFooter } from "../../components/LandingFooter";

const PERIOD = 30; // 30 segundos de vigencia del código QR

export default function MyTicket({ event, ticketMint, onBack }: { event: any, ticketMint: string, onBack: () => void }) {
  const [secs, setSecs] = useState(PERIOD);
  const [rotations, setRotations] = useState(0);
  const [flash, setFlash] = useState(false);
  const [copied, setCopied] = useState(false);
  
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
    try {
      const checks = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mintpass_demo_checkins') || '[]') : [];
      return checks.includes(ticketMint);
    } catch { return false; }
  })();

  const [poapClaimed, setPoapClaimed] = useState(() => {
    try {
      const poaps = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mintpass_demo_poaps') || '[]') : [];
      return poaps.includes(ticketMint);
    } catch { return false; }
  });

  // Mock Data Integration
  const isMock1 = ticketMint === 'mock1';
  const isMock2 = ticketMint === 'mock2';

  const ticketData = {
    name: isMock1 ? "Festival Sonora Norte" : isMock2 ? "Noche de jazz" : (event?.name || "Evento Desconocido"),
    date: isMock1 ? "Sáb 15 ago · 20:00 · Parque Metropolitano, León" : isMock2 ? "Dom 16 ago · 21:00 · Foro Indie Rocks, CDMX" : `${event?.date || ''} · ${event?.time || ''} · ${event?.venue || ''}`,
    zone: isMock1 ? "VIP" : isMock2 ? "General" : "General",
    folio: isMock1 ? "#0842" : isMock2 ? "#1109" : "#0001",
    gate: isMock1 ? "Puerta 4" : undefined,
    row: isMock1 ? "F" : undefined,
    seat: isMock1 ? "24" : undefined,
    isSoulbound: isMock2 ? true : (event?.isSoulbound || false),
    allowResale: isMock2 ? false : (event?.allowResale !== undefined ? event.allowResale : true),
    resaleCapLimit: isMock1 ? 1200 : event?.resaleCapLimit,
    allowRefunds: isMock1 ? true : (event?.allowRefunds || false),
    refundTimeLimit: isMock1 ? 3 : event?.refundTimeLimit,
    organizer: isMock1 ? "Codexia Live" : isMock2 ? "Jazz Club CDMX" : "Organizador Independiente",
    reputation: isMock1 ? 92 : isMock2 ? 85 : 100,
    eventsCompleted: isMock1 ? 14 : isMock2 ? 4 : 1
  };

  const handleClaimPoap = () => {
    showAlert(
      "Confirmar Evolución a POAP",
      "Evolucionar tu ticket a un POAP coleccionable requiere una tarifa de red de Solana (Gas Fee de 0.002 SOL aprox).\n\n¿Deseas firmar la transacción y continuar?",
      "info",
      "Firmar y Evolucionar",
      async () => {
        setIsMutating(true);
        try {
          await mutateToPoap(umi, {
            mintAddress: ticketMint,
            collectionMint: event?.collectionMint || "mock-collection",
            eventData: {
              name: ticketData.name,
              date: ticketData.date,
              venue: ticketData.date,
              ticketNumber: 1,
              totalAttendees: 100,
            },
            poapImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
          });
          
          const claimed = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mintpass_demo_poaps') || '[]') : [];
          claimed.push(ticketMint);
          localStorage.setItem('mintpass_demo_poaps', JSON.stringify(claimed));
          setPoapClaimed(true);

          setTimeout(() => {
            showAlert("¡POAP Reclamado!", "Tu ticket ha mutado exitosamente en la blockchain y ahora es un coleccionable permanente e inmutable.", "success");
          }, 300);
        } catch(e: any) {
          showAlert("Error Transaccional", "Fallo al reclamar POAP en devnet:\n" + e.message, "error");
        }
        setIsMutating(false);
      }
    );
  };

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

  useEffect(() => {
    window.scrollTo(0, 0); 
    const interval = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1) {
          setFlash(true);
          setTimeout(() => setFlash(false), 200);
          setRotations(r => r + 1);
          return PERIOD; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleShare = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const cryptoPayload = JSON.stringify({ 
    mint: ticketMint, 
    rot: rotations 
  });

  const shortMint = ticketMint.length > 10 ? `${ticketMint.slice(0,4)}…${ticketMint.slice(-4)}` : ticketMint;

  return (
    <div className="lp-container">
      <LandingNavBar />
      
      <div className="lp-content">
        <div className="mt-container">
          <button 
            onClick={onBack} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#5F5E5A', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: '22px' }}
            onMouseOver={e => e.currentTarget.style.color = '#1E1E1E'} 
            onMouseOut={e => e.currentTarget.style.color = '#5F5E5A'}
          >
            <Icons.ArrowLeft size={16} /> Volver a Mis boletos
          </button>

          <div className="mt-card">
            <div className="mt-content">
              <div className="mt-hero">
                {poapClaimed ? (
                   <span className="mt-badge-status poap">Coleccionable POAP</span>
                ) : isCheckedIn ? (
                   <span className="mt-badge-status used">Utilizado</span>
                ) : (
                   <span className="mt-badge-status">Activo</span>
                )}

                <div className={`mt-qr-ring ${isCheckedIn ? 'used' : ''} ${poapClaimed ? 'poap' : ''}`}>
                  <div className="mt-qr-box">
                    {poapClaimed ? (
                      <Icons.Medal size={64} color="#F59E0B" />
                    ) : isCheckedIn ? (
                      <button onClick={handleClaimPoap} disabled={isMutating} style={{background:'transparent', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px'}}>
                        {isMutating ? <Icons.Loader size={32} color="#14F195" className="animate-spin" /> : <Icons.Gift size={42} color="#14F195" />}
                        <span style={{fontSize: '10px', color: '#1E1E1E', fontWeight: 600}}>Reclamar POAP</span>
                      </button>
                    ) : (
                      <QRCode value={cryptoPayload} size={120} bgColor="#ffffff" fgColor="#111111" />
                    )}
                    {!isCheckedIn && !poapClaimed && <div className={`mt-flash ${flash ? 'show' : ''}`}></div>}
                  </div>
                </div>

                {!isCheckedIn && !poapClaimed && (
                  <>
                    <p className="mt-timer">Se renueva en <span>{secs}s</span></p>
                    <p className="mt-warning">Imposible de capturar en pantalla o reenviar</p>
                  </>
                )}
                {poapClaimed && <p className="mt-warning">Registrado permanentemente off-chain</p>}
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
                    <p className="mt-info-value">{shortMint}</p>
                  </div>
                </div>

                <div className="mt-verify">
                  <div className="mt-verify-icon">✓</div>
                  <div>
                    <p className="mt-verify-title">Verificado on-chain en Solana</p>
                    <p className="mt-verify-link">Ver estado en el explorador →</p>
                  </div>
                </div>

                <div className="mt-actions-row">
                  <button className="mt-btn mt-btn-primary">Agregar a wallet</button>
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
