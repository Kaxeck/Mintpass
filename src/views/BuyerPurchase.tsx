'use client';
import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { EventModel } from '../types';
import { useUmi } from "../providers";
import { mintTicket, getOrganizerReputation } from "../lib/metaplex";
import { useWalletSession, useSolanaClient } from "@solana/react-hooks";
import { type Address } from "@solana/kit";
import WalletButton from "../components/WalletButton";
import AlertModal, { AlertModalProps } from "../components/AlertModal";
import { LandingNavBar } from "../components/LandingNavBar";
import { LandingFooter } from "../components/LandingFooter";
import "../Home.css";

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
          
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px 80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '12px', color: '#5F5E5A' }}>
              <span onClick={onBack} style={{ cursor: 'pointer', color: '#5F5E5A', textDecoration: 'underline' }}>Explorar</span> &nbsp;/&nbsp; <span style={{ color: '#1E1E1E' }}>{event.name}</span>
            </div>
            <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 600, color: '#1E1E1E' }}>{event.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <span style={{ background: '#EAF3DE', color: '#27500A', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icons.ShieldCheck size={12} /> Verificado en Solana
              </span>
              <span style={{ fontSize: '13px', color: '#5F5E5A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icons.CalendarDays size={14} /> {event.date} &nbsp;·&nbsp; {event.venue}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              
              {/* LEFT COLUMN */}
              <div style={{ flex: '1 1 500px' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
                  <div style={{ flex: 2, height: '280px', background: event.bg, borderRadius: '16px 0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=800&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.8, mixBlendMode: 'overlay' }}></div>
                    <EventIcon size={64} color="#ffffff" style={{ position: 'relative', zIndex: 10, opacity: 0.9 }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ flex: 1, background: '#2C2C2A', borderRadius: '0 16px 0 0', backgroundImage: 'url("https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.9 }}></div>
                    <div style={{ flex: 1, background: '#3A3A38', borderRadius: '0 0 16px 0', backgroundImage: 'url("https://images.unsplash.com/photo-1470229722913-7c092bce42f1?q=80&w=400&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.9 }}></div>
                  </div>
                </div>

                <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: '#1E1E1E' }}>Sobre el evento</p>
                <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#5F5E5A', lineHeight: 1.6, maxWidth: '520px' }}>
                  Asegura tu entrada oficial. Este evento utiliza la infraestructura de Mintpass sobre Solana para garantizar boletos verificables, previniendo la reventa no autorizada y ofreciendo una experiencia rápida y segura.
                </p>

                <p style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600, color: '#1E1E1E' }}>Ubicación</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '32px' }}>
                  <div style={{ width: '80px', height: '80px', background: '#F7F8F7', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.MapPin size={24} color="#D3D1C7" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>{event.venue}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5F5E5A' }}>📍 Dirección del venue no especificada.</p>
                  </div>
                </div>

                <div style={{ background: '#F7F8F7', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '400px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#D3D1C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.User size={20} color="#FFFFFF" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1E1E1E' }}>Organizador</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#5F5E5A' }}>
                      {reputationLabel()}
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (Sticky Purchase Card) */}
              <div style={{ flex: '1 1 340px', position: 'sticky', top: '100px' }}>
                {screen === 'buy' ? (
                  <div style={{ border: '1px solid #D3D1C7', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.06)', background: '#FFFFFF' }}>
                    <p style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#1E1E1E' }}>Elige tus boletos</p>
                    
                    <div style={{ background: '#2C2C2A', color: '#B4B2A9', textAlign: 'center', fontSize: '10px', padding: '6px', borderRadius: '6px', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>ESCENARIO</div>

                    {/* Mock Zone VIP */}
                    <div style={{ border: '1px solid #D3D1C7', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>VIP</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#E24B4A' }}>Agotado</p>
                      </div>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1E1E1E' }}>$1,200</p>
                    </div>

                    {/* Mock Zone Preferente */}
                    <div style={{ border: '1px solid #D3D1C7', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Preferente</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#E24B4A' }}>Agotado</p>
                      </div>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1E1E1E' }}>$850</p>
                    </div>

                    {/* Real Zone General */}
                    <div style={{ border: '2px solid #14F195', background: '#F7F8F7', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Acceso General</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: available > 0 ? '#27500A' : '#E24B4A' }}>
                          {available > 0 ? `${available} disponibles` : 'Agotado'}
                        </p>
                      </div>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1E1E1E' }}>
                        {event.price === 0 ? 'Gratis' : `${event.price} SOL`}
                      </p>
                    </div>

                    {available > 0 && (
                      <div style={{ background: '#FFFFFF', border: '1px solid #D3D1C7', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '12px', color: '#5F5E5A' }}>Cantidad</p>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: '#1E1E1E' }}>Max. {maxAllowed} por wallet</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button onClick={() => changeQty(-1)} style={{ width: '32px', height: '32px', border: '1px solid #D3D1C7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#1E1E1E', cursor: 'pointer', background: '#FFFFFF' }}>−</button>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: '#1E1E1E', minWidth: '16px', textAlign: 'center' }}>{qty}</span>
                          <button onClick={() => changeQty(1)} style={{ width: '32px', height: '32px', background: '#1E1E1E', color: '#FFFFFF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer', border: 'none' }}>+</button>
                        </div>
                      </div>
                    )}

                    {event.price > 0 && available > 0 && (
                      <div style={{ borderTop: '0.5px solid #D3D1C7', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontSize: '14px', color: '#5F5E5A', fontWeight: 500 }}>Total ({qty} {qty === 1 ? 'boleto' : 'boletos'})</span>
                        <span style={{ fontSize: '18px', fontWeight: 600, color: '#1E1E1E' }}>{(qty * event.price).toFixed(3)} SOL</span>
                      </div>
                    )}

                    <button 
                      onClick={() => setScreen('checkout')} 
                      disabled={available <= 0 || maxAllowed <= 0}
                      style={{ 
                        width: '100%', 
                        background: (available <= 0 || maxAllowed <= 0) ? '#D3D1C7' : '#14F195', 
                        color: '#1E1E1E', 
                        textAlign: 'center', 
                        padding: '14px', 
                        borderRadius: '12px', 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        border: 'none', 
                        cursor: (available <= 0 || maxAllowed <= 0) ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: (available > 0 && maxAllowed > 0) ? '0 4px 12px rgba(20, 241, 149, 0.2)' : 'none'
                      }}
                    >
                      {maxAllowed <= 0 ? 'LÍMITE ALCANZADO' : available <= 0 ? 'AGOTADO' : 'Continuar'}
                    </button>
                  </div>
                ) : screen === 'checkout' ? (
                  <div style={{ border: '1px solid #D3D1C7', borderRadius: '16px', overflow: 'hidden', fontFamily: 'var(--font-sans)', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', background: '#FFFFFF' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #D3D1C7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span onClick={() => setScreen('buy')} style={{ fontSize: '13px', color: '#5F5E5A', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Icons.ArrowLeft size={16} style={{ marginRight: '6px' }} /> Confirmar boleto
                      </span>
                      <span style={{ fontSize: '11px', color: '#5F5E5A', fontWeight: 500 }}>Paso único</span>
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

                    <div style={{ margin: '16px 18px', background: '#F7F8F7', borderRadius: '12px', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1E1E1E', marginBottom: '6px', fontWeight: 500 }}>
                        <span>{qty} boleto{qty > 1 ? 's' : ''} general</span><span>{(qty * event.price).toFixed(3)} SOL</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#5F5E5A', marginBottom: '6px' }}>
                        <span>Servicio (visible, sin sorpresas)</span><span>0.00 SOL</span>
                      </div>
                      <div style={{ borderTop: '0.5px solid #D3D1C7', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 600, color: '#1E1E1E' }}>
                        <span>Total</span><span>{(qty * event.price).toFixed(3)} SOL</span>
                      </div>
                    </div>

                    <div style={{ margin: '0 18px 12px', fontSize: '12px', color: '#5F5E5A', fontWeight: 500 }}>Método de pago</div>
                    <div style={{ margin: '0 18px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <div onClick={() => setPaymentMethod('tarjeta')} style={{ flex: 1, minWidth: '90px', border: paymentMethod === 'tarjeta' ? '1px solid #1E1E1E' : '1px solid #D3D1C7', borderRadius: '10px', padding: '10px', textAlign: 'center', fontSize: '12px', color: paymentMethod === 'tarjeta' ? '#1E1E1E' : '#5F5E5A', fontWeight: paymentMethod === 'tarjeta' ? 600 : 500, cursor: 'pointer', background: paymentMethod === 'tarjeta' ? '#F7F8F7' : '#FFFFFF', transition: 'all 0.2s' }}>MercadoPago</div>
                      <div onClick={() => setPaymentMethod('oxxo')} style={{ flex: 1, minWidth: '90px', border: paymentMethod === 'oxxo' ? '1px solid #1E1E1E' : '1px solid #D3D1C7', borderRadius: '10px', padding: '10px', textAlign: 'center', fontSize: '12px', color: paymentMethod === 'oxxo' ? '#1E1E1E' : '#5F5E5A', fontWeight: paymentMethod === 'oxxo' ? 600 : 500, cursor: 'pointer', background: paymentMethod === 'oxxo' ? '#F7F8F7' : '#FFFFFF', transition: 'all 0.2s' }}>Blink</div>
                      <div onClick={() => setPaymentMethod('wallet')} style={{ flex: 1, minWidth: '90px', border: paymentMethod === 'wallet' ? '1px solid #4BAA46' : '1px solid #D3D1C7', borderRadius: '10px', padding: '10px', textAlign: 'center', fontSize: '12px', color: paymentMethod === 'wallet' ? '#27500A' : '#5F5E5A', fontWeight: paymentMethod === 'wallet' ? 600 : 500, cursor: 'pointer', background: paymentMethod === 'wallet' ? '#EAF3DE' : '#FFFFFF', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Icons.Wallet size={14} /> Wallet
                      </div>
                    </div>

                    <div style={{ margin: '20px 18px 6px' }}>
                      <button 
                        onClick={() => {
                          if (paymentMethod !== 'wallet') {
                            showAlert("Método de pago no disponible", "En esta versión demo on-chain, todas las compras de entradas se realizan mediante Wallet con SOL.", "info");
                          } else {
                            setScreen('wallet-checkout');
                          }
                        }}
                        style={{ width: '100%', background: '#14F195', color: '#1E1E1E', textAlign: 'center', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(20,241,149,0.2)' }}
                      >
                        Confirmar y comprar
                      </button>
                    </div>

                    <div style={{ margin: '12px 18px 24px', textAlign: 'center', fontSize: '11px', color: '#5F5E5A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Icons.ShieldCheck size={14} /> Boleto verificable en Solana
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #D3D1C7', borderRadius: '16px', overflow: 'hidden', fontFamily: 'var(--font-sans)', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', background: '#FFFFFF' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #D3D1C7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span onClick={() => setScreen('checkout')} style={{ fontSize: '13px', color: '#5F5E5A', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Icons.ArrowLeft size={16} style={{ marginRight: '6px' }} /> Pagar con wallet
                      </span>
                      <span style={{ fontSize: '11px', color: '#5F5E5A' }}>Sin pasarela fiat</span>
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

                    <div style={{ margin: '16px 18px', background: '#F7F8F7', borderRadius: '12px', padding: '14px 16px' }}>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#5F5E5A' }}>Resumen de la transacción</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1E1E1E', marginBottom: '6px' }}>
                        <span>Precio del boleto</span><span>{(qty * event.price).toFixed(3)} SOL</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#1E1E1E', marginBottom: '6px' }}>
                        <span>Comisión de red</span><span>0.0001 SOL</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#3C3489', marginBottom: '6px' }}>
                        <span>Price cap aplicado por el contrato</span><span>✓ dentro del límite</span>
                      </div>
                      <div style={{ borderTop: '0.5px solid #D3D1C7', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 500, color: '#1E1E1E' }}>
                        <span>Total a firmar</span><span>{(qty * event.price + 0.0001).toFixed(4)} SOL</span>
                      </div>
                    </div>

                    <div style={{ margin: '0 18px 12px', background: '#EEEDFE', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                        style={{ width: '100%', background: '#14F195', color: '#1E1E1E', textAlign: 'center', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
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
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#F1EFE8] animate-in fade-in duration-500 rounded-[12px]">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-[4px] border-[#D3D1C7] rounded-full"></div>
            <div className="absolute inset-0 border-[4px] border-[#1E1E1E] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center bg-[#FFFFFF] rounded-full m-1 border border-[#D3D1C7] shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
              <Icons.Loader size={28} className="text-[#1E1E1E] animate-pulse" />
            </div>
          </div>

          <h2 className="text-[24px] font-semibold text-[#1E1E1E] mb-2 tracking-tight">Autorizando acceso</h2>
          <p className="text-[14px] text-[#5F5E5A] mb-12">Interactuando de forma segura con la red Solana...</p>

          <div className="w-full max-w-[340px] flex flex-col gap-3">
            {[
              { step: 1, label: 'Verificando Wallet' },
              { step: 2, label: 'Firmando transacción' },
              { step: 3, label: 'Generando activo digital' },
              { step: 4, label: 'Confirmación On-Chain' }
            ].map((s) => (
              <div key={s.step} className={`flex items-center gap-4 p-4 rounded-[12px] border transition-all duration-500 ${progressStep === s.step ? 'bg-[#FFFFFF] border-[#1E1E1E] shadow-[0_4px_16px_rgba(0,0,0,0.05)]' : 'bg-[#FFFFFF]/50 border-[#D3D1C7]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-300 ${progressStep > s.step ? 'bg-[#14F195]/20 border-[#14F195] text-[#27500A]' :
                    progressStep === s.step ? 'bg-[#1E1E1E] border-[#1E1E1E] text-[#FFFFFF]' : 'bg-[#F7F8F7] border-[#D3D1C7] text-[#A1A1AA]'
                  }`}>
                  {progressStep > s.step ? <Icons.Check size={14} strokeWidth={3} /> :
                    progressStep === s.step ? <div className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse"></div> :
                      <span className="text-[12px] font-bold">{s.step}</span>}
                </div>
                <div className={`text-[14px] font-medium tracking-wide ${progressStep >= s.step ? 'text-[#1E1E1E]' : 'text-[#5F5E5A]'}`}>
                  {s.label}
                </div>
              </div>
            ))}
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