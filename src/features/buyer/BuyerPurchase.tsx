'use client';
import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { EventModel } from '../../types';
import { useUmi } from "../../providers";
import { mintTicket, getOrganizerReputation } from "../../lib/metaplex";
import { useWalletSession, useSolanaClient } from "@solana/react-hooks";
import { type Address } from "@solana/kit";
import WalletButton from "../../components/WalletButton";
import AlertModal, { AlertModalProps } from "../../components/AlertModal";
import { LandingNavBar } from "../../components/LandingNavBar";
import { LandingFooter } from "../../components/LandingFooter";
import "../../Home.css";
import "../../styles/BuyerPurchase.css";

export default function BuyerPurchase({
  event,
  collectionMint,
  ownedTicketsCount = 0,
  onSuccessMint,
  onBack,
  onGoToMyTicket
}: {
  event: EventModel;
  collectionMint: string;
  ownedTicketsCount?: number;
  onSuccessMint: (mints: string | string[], qty: number) => void;
  onBack: () => void;
  onGoToMyTicket: () => void;
}) {
  const umi = useUmi();
  const session = useWalletSession();
  const client = useSolanaClient();
  const rpcRaw = client?.runtime?.rpc;

  const [screen, setScreen] = useState<'buy' | 'checkout' | 'wallet-checkout' | 'processing' | 'success'>('buy');
  const [paymentMethod, setPaymentMethod] = useState<'tarjeta' | 'oxxo' | 'wallet'>('wallet');
  const [qty, setQty] = useState(1);
  const [progressStep, setProgressStep] = useState(0);
  const [orgReputation, setOrgReputation] = useState<number | null>(null);

  const walletAddress: Address | null = session?.account?.address ?? null;
  const walletConnected = !!walletAddress;

  const [alertConfig, setAlertConfig] = useState<AlertModalProps>({
    isOpen: false, title: '', message: '', type: 'info',
    onClose: () => setAlertConfig(p => ({ ...p, isOpen: false }))
  });

  const showAlert = (title: string, message: string, type: AlertModalProps['type']) => {
    setAlertConfig(prev => ({ ...prev, isOpen: true, title, message, type }));
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Consulta la reputación del organizador desde la blockchain
  useEffect(() => {
    async function fetchOrgRep() {
      if (!rpcRaw) return;
      try {
        const wrapper = {
          async getAccountInfo(address: Address) {
            const result = await (rpcRaw.getAccountInfo as any)(address, { encoding: 'base64' }).send();
            if (!result.value) return null;
            const decoded = Buffer.from(result.value.data[0], 'base64');
            return { data: new Uint8Array(decoded) };
          }
        };
        const score = await getOrganizerReputation(wrapper, walletAddress as Address);
        setOrgReputation(score);
      } catch (e) {
        console.warn('No se pudo consultar la reputación del organizador:', e);
        setOrgReputation(0);
      }
    }
    if (walletAddress) fetchOrgRep();
  }, [rpcRaw, walletAddress]);

  const available = event.total - event.sold;

  let maxAllowed = 4;
  if (event.limitPerWallet) {
    maxAllowed = Math.max(0, event.limitPerWallet - ownedTicketsCount);
  }

  useEffect(() => {
    if (maxAllowed === 0 && qty !== 0) setQty(0);
    else if (maxAllowed > 0 && qty === 0) setQty(1);
    else if (qty > maxAllowed) setQty(maxAllowed);
  }, [maxAllowed, qty]);

  const pctSold = Math.round((event.sold / event.total) * 100);
  const progressBarColor = pctSold > 85
    ? 'bg-gradient-to-r from-[#E24B4A] to-[#ff6b6b]'
    : pctSold > 50
      ? 'bg-gradient-to-r from-[#FAC775] to-[#F0997B]'
      : 'bg-gradient-to-r from-[#1D9E75] to-[#5DCAA5]';

  const changeQty = (delta: number) => {
    setQty(prev => Math.max(1, Math.min(maxAllowed, Math.min(available, prev + delta))));
  };

  const startPurchase = async () => {
    if (!walletConnected) {
      showAlert("Wallet Desconectada", "Conecta tu wallet (paso 1) para asegurar y encriptar tu entrada on-chain.", "warning");
      return;
    }
    if (!collectionMint) {
      showAlert("Demo Temporal", "Este evento es una demostración. El organizador aún no ha lanzado su contrato oficial on-chain.", "info");
      return;
    }

    setScreen('processing');
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= 3) setProgressStep(step);
    }, 900);

    try {
      const ticketMints = await mintTicket(umi, {
        collectionMint,
        buyerAddress: walletAddress!,
        priceSol: qty * event.price,
        qty: qty,
        eventData: {
          name: event.name,
          date: event.date,
          venue: event.venue,
          ticketNumber: event.sold + 1,
          imageUrl: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=800&auto=format&fit=crop"
        }
      });
      clearInterval(interval);
      setProgressStep(4);
      onSuccessMint(ticketMints, qty);
      setTimeout(() => setScreen('success'), 600);
    } catch (e: unknown) {
      console.error(e);
      clearInterval(interval);
      const msg = e instanceof Error ? e.message : String(e);
      showAlert("Error de Transacción", "La compra no pudo ser procesada en la red:\n" + msg, "error");
      setScreen('buy');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EventIcon = (Icons as any)[event.icon] || Icons.HelpCircle;

  const reputationLabel = () => {
    if (orgReputation === null) return <span className="text-[#AFA9EC]">Consultando...</span>;
    if (orgReputation >= 50) return <span className="text-[#5DCAA5] font-bold">⭐ Excelente ({orgReputation} pts)</span>;
    if (orgReputation >= 20) return <span className="text-[#EF9F27] font-bold">👍 Buena ({orgReputation} pts)</span>;
    if (orgReputation > 0) return <span className="text-[#AFA9EC] font-bold">🆕 Nueva ({orgReputation} pts)</span>;
    return <span className="text-[#666] font-bold">Sin historial</span>;
  };

  return (
    <div className="lp-container relative">
      {(screen === 'buy' || screen === 'checkout' || screen === 'wallet-checkout') && (
        <main className="lp-content">
          <LandingNavBar onGoToExplore={onBack} onGoToMyTickets={onGoToMyTicket} />
          
          <div className="bp-layout">
            <div style={{ marginBottom: '24px' }}>
              <button 
                onClick={onBack}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#5F5E5A', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: 0 }}
                onMouseOver={e => e.currentTarget.style.color = '#1E1E1E'} 
                onMouseOut={e => e.currentTarget.style.color = '#5F5E5A'}
              >
                <Icons.ArrowLeft size={16} /> Volver a Explorar
              </button>
            </div>
            <p className="bp-title">{event.name}</p>
            <div className="bp-meta-tags">
              <span className="bp-tag-green">
                <Icons.ShieldCheck size={12} /> Verificado en Solana
              </span>
              <span className="bp-tag-gray">
                <Icons.CalendarDays size={14} /> {event.date} &nbsp;·&nbsp; {event.venue}
              </span>
            </div>

            <div className="bp-grid">
              
              {/* LEFT COLUMN */}
              <div className="bp-left-col">
                <div className="bp-images">
                  <div className="bp-img-main" style={{ background: event.bg }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=800&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.8, mixBlendMode: 'overlay' }}></div>
                    <EventIcon size={64} color="#ffffff" style={{ position: 'relative', zIndex: 10, opacity: 0.9 }} />
                  </div>
                  <div className="bp-img-col">
                    <div className="bp-img-sub" style={{ background: '#2C2C2A', borderRadius: '0 16px 0 0', backgroundImage: 'url("https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&auto=format&fit=crop")' }}></div>
                    <div className="bp-img-sub" style={{ background: '#3A3A38', borderRadius: '0 0 16px 0', backgroundImage: 'url("https://images.unsplash.com/photo-1470229722913-7c092bce42f1?q=80&w=400&auto=format&fit=crop")' }}></div>
                  </div>
                </div>

                <p className="bp-h3">Sobre el evento</p>
                <p className="bp-p">
                  Asegura tu entrada oficial. Este evento utiliza la infraestructura de Mintpass sobre Solana para garantizar boletos verificables, previniendo la reventa no autorizada y ofreciendo una experiencia rápida y segura.
                </p>

                <p className="bp-h3">Ubicación</p>
                <div className="bp-info-row">
                  <div className="bp-info-icon">
                    <Icons.MapPin size={24} color="#D3D1C7" />
                  </div>
                  <div>
                    <p className="bp-info-title">{event.venue}</p>
                    <p className="bp-info-sub">📍 Dirección del venue no especificada.</p>
                  </div>
                </div>

                <p className="bp-h3">Detalles Adicionales</p>
                <div className="bp-info-row" style={{ marginBottom: '12px' }}>
                  <div className="bp-info-icon">
                    <Icons.Clock size={20} color="#D3D1C7" />
                  </div>
                  <div>
                    <p className="bp-info-title">Apertura de puertas</p>
                    <p className="bp-info-sub">Las puertas abren 2 horas antes del evento.</p>
                  </div>
                </div>
                <div className="bp-info-row">
                  <div className="bp-info-icon">
                    <Icons.UserCheck size={20} color="#D3D1C7" />
                  </div>
                  <div>
                    <p className="bp-info-title">Clasificación</p>
                    <p className="bp-info-sub">Todas las edades</p>
                  </div>
                </div>
                <div className="bp-info-row" style={{ marginTop: '12px' }}>
                  <div className="bp-info-icon">
                    <Icons.PhoneCall size={20} color="#D3D1C7" />
                  </div>
                  <div>
                    <p className="bp-info-title">Contacto de Soporte</p>
                    <p className="bp-info-sub">ayuda@mintpass.app</p>
                  </div>
                </div>

                <div className="bp-org-card">
                  <div className="bp-org-avatar">
                    <Icons.User size={20} color="#FFFFFF" />
                  </div>
                  <div>
                    <p className="bp-info-title">Organizador</p>
                    <p className="bp-info-sub" style={{ margin: '2px 0 0', fontSize: '12px' }}>
                      {reputationLabel()}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (Sticky Purchase Card) */}
              <div className="bp-right-col">
                {screen === 'buy' ? (
                  <div className="bp-card bp-card-pad">
                    <p className="bp-h3" style={{ fontSize: '18px', marginBottom: '16px' }}>Elige tus boletos</p>
                    
                    <div className="bp-stage-label">ESCENARIO</div>

                    {/* Mock Zone VIP */}
                    <div className="bp-zone-item disabled">
                      <div>
                        <p className="bp-zone-title">VIP</p>
                        <p className="bp-zone-sub" style={{ color: '#E24B4A' }}>Agotado</p>
                      </div>
                      <p className="bp-zone-price">$1,200</p>
                    </div>

                    {/* Mock Zone Preferente */}
                    <div className="bp-zone-item disabled">
                      <div>
                        <p className="bp-zone-title">Preferente</p>
                        <p className="bp-zone-sub" style={{ color: '#E24B4A' }}>Agotado</p>
                      </div>
                      <p className="bp-zone-price">$850</p>
                    </div>

                    {/* Real Zone General */}
                    <div className="bp-zone-item active">
                      <div>
                        <p className="bp-zone-title">Acceso General</p>
                        <p className="bp-zone-sub" style={{ color: available > 0 ? '#27500A' : '#E24B4A' }}>
                          {available > 0 ? `${available} disponibles` : 'Agotado'}
                        </p>
                      </div>
                      <p className="bp-zone-price">
                        {event.price === 0 ? 'Gratis' : `${event.price} SOL`}
                      </p>
                    </div>

                    {available > 0 && (
                      <div className="bp-qty-box">
                        <div>
                          <p style={{ margin: 0, fontSize: '12px', color: '#5F5E5A' }}>Cantidad</p>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: '#1E1E1E' }}>Max. {maxAllowed} por wallet</p>
                        </div>
                        <div className="bp-qty-actions">
                          <button onClick={() => changeQty(-1)} className="bp-qty-btn light">−</button>
                          <span className="bp-qty-val">{qty}</span>
                          <button onClick={() => changeQty(1)} className="bp-qty-btn dark">+</button>
                        </div>
                      </div>
                    )}

                    {event.price > 0 && available > 0 && (
                      <div className="bp-total-row">
                        <span style={{ fontSize: '14px', color: '#5F5E5A', fontWeight: 500 }}>Total ({qty} {qty === 1 ? 'boleto' : 'boletos'})</span>
                        <span style={{ fontSize: '18px', fontWeight: 600, color: '#1E1E1E' }}>{(qty * event.price * 1.05).toFixed(3)} SOL</span>
                      </div>
                    )}

                    <button 
                      onClick={() => setScreen('checkout')} 
                      disabled={available <= 0 || maxAllowed <= 0}
                      className="bp-btn-primary"
                    >
                      {maxAllowed <= 0 ? 'LÍMITE ALCANZADO' : available <= 0 ? 'AGOTADO' : 'Continuar'}
                    </button>
                  </div>
                ) : screen === 'checkout' ? (
                  <div className="bp-card">
                    <div className="bp-card-header">
                      <span className="link" onClick={() => setScreen('buy')}>
                        <Icons.ArrowLeft size={16} style={{ marginRight: '6px' }} /> Confirmar boleto
                      </span>
                      <span className="info">Paso único</span>
                    </div>
                    
                    <div style={{ padding: '16px 18px 0' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: event.bg, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <EventIcon size={24} color="#FFFFFF" style={{ position: 'relative', zIndex: 10 }} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>{event.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#5F5E5A' }}>{event.date} · {event.venue}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bp-summary-box">
                      <div className="bp-summary-row" style={{ fontWeight: 500 }}>
                        <span>{qty} boleto{qty > 1 ? 's' : ''} general</span><span>{(qty * event.price).toFixed(3)} SOL</span>
                      </div>
                      <div className="bp-summary-row" style={{ color: '#5F5E5A' }}>
                        <span>Servicio (5%)</span><span>{event.price === 0 ? '0.00' : (qty * event.price * 0.05).toFixed(3)} SOL</span>
                      </div>
                      <div className="bp-summary-total">
                        <span>Total</span><span>{event.price === 0 ? '0.00' : (qty * event.price * 1.05).toFixed(3)} SOL</span>
                      </div>
                    </div>

                    <div style={{ margin: '0 18px 12px', fontSize: '12px', color: '#5F5E5A', fontWeight: 500 }}>Método de pago</div>
                    <div className="bp-wallet-opts">
                      <div 
                        onClick={() => setPaymentMethod('tarjeta')} 
                        className={`bp-wallet-opt ${paymentMethod === 'tarjeta' ? 'selected' : ''}`}
                      >MercadoPago</div>
                      <div 
                        onClick={() => setPaymentMethod('oxxo')} 
                        className={`bp-wallet-opt ${paymentMethod === 'oxxo' ? 'selected' : ''}`}
                      >Blink</div>
                      <div 
                        onClick={() => setPaymentMethod('wallet')} 
                        className={`bp-wallet-opt ${paymentMethod === 'wallet' ? 'selected green' : ''}`}
                      >
                        <Icons.Wallet size={14} /> Wallet
                      </div>
                    </div>

                    <div style={{ margin: '20px 18px 6px' }}>
                      <button 
                        onClick={() => {
                          if (paymentMethod !== 'wallet') {
                            showAlert("Método de pago no disponible", "En esta versión demo on-chain, todas las compras de entradas se realizan mediante Wallet con SOL.", "warning");
                          } else {
                            setScreen('wallet-checkout');
                          }
                        }}
                        className="bp-btn-primary"
                      >
                        Confirmar y comprar
                      </button>
                    </div>

                    <div style={{ margin: '12px 18px 24px', textAlign: 'center', fontSize: '11px', color: '#5F5E5A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Icons.ShieldCheck size={14} /> Boleto verificable en Solana
                    </div>
                  </div>
                ) : (
                  <div className="bp-card">
                    <div className="bp-card-header">
                      <span className="link" onClick={() => setScreen('checkout')}>
                        <Icons.ArrowLeft size={16} style={{ marginRight: '6px' }} /> Pagar con wallet
                      </span>
                      <span className="info">Sin pasarela fiat</span>
                    </div>

                    {!walletConnected && (
                      <div style={{ padding: '16px 18px 0' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#5F5E5A' }}>Conecta tu wallet</p>
                        <WalletButton style={{ width: '100%', justifyContent: 'center', height: '48px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: '#1E1E1E', color: '#FFFFFF', border: 'none' }} />
                      </div>
                    )}

                    {walletConnected && (
                      <div style={{ margin: '16px 18px 0', background: '#F7F8F7', borderRadius: '6px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#639922', display: 'inline-block' }}></span>
                        <span style={{ fontSize: '11px', color: '#3B6D11' }}>Conectado · {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}</span>
                      </div>
                    )}

                    <div className="bp-summary-box">
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#5F5E5A' }}>Resumen de la transacción</p>
                      <div className="bp-summary-row">
                        <span>Precio del boleto</span><span>{(qty * event.price).toFixed(3)} SOL</span>
                      </div>
                      <div className="bp-summary-row">
                        <span>Comisión de red</span><span>0.0001 SOL</span>
                      </div>
                      <div className="bp-summary-row" style={{ color: '#3C3489' }}>
                        <span>Price cap aplicado por el contrato</span><span>✓ dentro del límite</span>
                      </div>
                      <div className="bp-summary-total">
                        <span>Total a firmar</span><span>{(qty * event.price + 0.0001).toFixed(4)} SOL</span>
                      </div>
                    </div>

                    <div className="bp-alert-box">
                      <Icons.Lock style={{ fontSize: '20px', color: '#3C3489' }} />
                      <p style={{ margin: 0, fontSize: '11px', color: '#3C3489' }}>El NFT llega ya congelado a tu wallet en la misma transacción</p>
                    </div>

                    <div style={{ margin: '4px 18px 6px' }}>
                      <button 
                        onClick={() => {
                          if (!walletConnected) {
                            showAlert("Conecta tu wallet", "Por favor conecta tu wallet usando el botón en la barra superior antes de firmar.", "info");
                          } else {
                            startPurchase();
                          }
                        }}
                        className="bp-btn-primary"
                      >
                        Firmar y confirmar
                      </button>
                    </div>
                    <div style={{ margin: '0 18px 20px', textAlign: 'center', fontSize: '11px', color: '#5F5E5A' }}>
                      Independiente de MercadoPago, Stripe y Crossmint
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
          <LandingFooter />
        </main>
      )}



      {/* PROCESSING SCREEN */}
      {screen === 'processing' && (
        <div className="bp-processing animate-in fade-in duration-500">
          <div style={{ position: 'relative', width: '96px', height: '96px', marginBottom: '32px' }}>
            <div style={{ position: 'absolute', inset: 0, border: '4px solid #D3D1C7', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', inset: 0, border: '4px solid #1E1E1E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <div style={{ position: 'absolute', inset: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', borderRadius: '50%', border: '1px solid #D3D1C7', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <Icons.Loader size={28} color="#1E1E1E" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            </div>
          </div>

          <h2>Autorizando acceso</h2>
          <p className="bp-processing-sub">Interactuando de forma segura con la red Solana...</p>

          <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { step: 1, label: 'Verificando Wallet' },
              { step: 2, label: 'Firmando transacción' },
              { step: 3, label: 'Generando activo digital' },
              { step: 4, label: 'Confirmación On-Chain' }
            ].map((s) => {
              const status = progressStep > s.step ? 'done' : progressStep === s.step ? 'active' : 'todo';
              return (
                <div key={s.step} className="bp-step" style={{ 
                  background: status === 'todo' ? 'rgba(255,255,255,0.5)' : '#FFFFFF',
                  borderColor: status === 'active' ? '#1E1E1E' : '#D3D1C7',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: status === 'done' ? 'rgba(20,241,149,0.2)' : status === 'active' ? '#1E1E1E' : '#F7F8F7',
                    border: `1px solid ${status === 'done' ? '#14F195' : status === 'active' ? '#1E1E1E' : '#D3D1C7'}`,
                    color: status === 'done' ? '#27500A' : status === 'active' ? '#FFFFFF' : '#A1A1AA'
                  }}>
                    {status === 'done' ? <Icons.Check size={14} strokeWidth={3} /> :
                     status === 'active' ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF', animation: 'pulse 2s infinite' }}></div> :
                     <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{s.step}</span>}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.025em', color: status === 'todo' ? '#5F5E5A' : '#1E1E1E' }}>
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUCCESS SCREEN */}
      {screen === 'success' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#F1EFE8] animate-in fade-in zoom-in-95 duration-500 rounded-[12px]">
          <div className="w-[88px] h-[88px] rounded-full bg-[#14F195]/20 border border-[#14F195] flex items-center justify-center mb-6 shadow-[0_4px_24px_rgba(20,241,149,0.3)]">
            <Icons.Check size={44} className="text-[#27500A]" />
          </div>

          <h2 className="text-[28px] font-bold text-[#1E1E1E] mb-2 tracking-tight">Acceso Concedido</h2>
          <p className="text-[14px] text-[#5F5E5A] mb-10 font-medium tracking-wide">Tu ticket NFT fue minteado exitosamente</p>

          <div className="max-w-[340px] w-full bg-[#FFFFFF] border border-[#D3D1C7] rounded-[24px] overflow-hidden mb-8 relative shadow-[0_10px_40px_rgba(0,0,0,0.1)] transform rotate-[-1deg] hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="h-[140px] flex items-center justify-center relative" style={{ background: event.bg }}>
              <div className="absolute inset-0 bg-black/20 mix-blend-overlay"></div>
              <EventIcon size={56} color="#FFFFFF" className="drop-shadow-lg relative z-10" />
            </div>

            <div className="p-6 relative text-center">
              <div className="absolute -top-[24px] right-6 w-[48px] h-[48px] bg-[#FFFFFF] rounded-full flex items-center justify-center border border-[#D3D1C7] shadow-lg z-10">
                <Icons.QrCode size={20} className="text-[#1E1E1E]" />
              </div>

              <div className="inline-block px-3 py-1 bg-[#F1EFE8] rounded-md text-[10px] text-[#5F5E5A] font-mono tracking-widest uppercase mb-3 border border-[#D3D1C7]">
                MINT PASS · SOLANA
              </div>

              <h3 className="text-[20px] font-bold text-[#1E1E1E] mb-4 leading-tight">
                {event.name} <span className="text-[#A1A1AA] ml-1">#{event.sold + 1}</span>
              </h3>

              <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-[#F7F8F7] border border-[#D3D1C7] px-3 py-1.5 rounded-[8px] text-[11px] font-medium text-[#1E1E1E]">{event.date}</span>
                <span className="bg-[#F7F8F7] border border-[#D3D1C7] px-3 py-1.5 rounded-[8px] text-[11px] font-medium text-[#1E1E1E]">{event.venue}</span>
              </div>
            </div>

            <div className="absolute bottom-[70px] -left-[16px] w-[32px] h-[32px] bg-[#F1EFE8] rounded-full border-r border-[#D3D1C7]"></div>
            <div className="absolute bottom-[70px] -right-[16px] w-[32px] h-[32px] bg-[#F1EFE8] rounded-full border-l border-[#D3D1C7]"></div>
            <div className="absolute bottom-[86px] left-8 right-8 h-px border-t-[2px] border-dashed border-[#D3D1C7] opacity-50"></div>
          </div>

          <div className="flex max-w-[340px] w-full gap-4">
            <button onClick={onGoToMyTicket} className="flex-[2] bg-[#1E1E1E] hover:bg-[#333] text-[#FFFFFF] h-[56px] rounded-[16px] font-bold text-[14px] transition-all cursor-pointer shadow-md">
              Mostrar QR
            </button>
            <button onClick={onBack} className="flex-1 bg-[#FFFFFF] hover:bg-[#F7F8F7] text-[#1E1E1E] h-[56px] rounded-[16px] font-semibold text-[14px] transition-colors cursor-pointer border border-[#D3D1C7]">
              Inicio
            </button>
          </div>
        </div>
      )}

      <AlertModal {...alertConfig} />
    </div>
  );
}
