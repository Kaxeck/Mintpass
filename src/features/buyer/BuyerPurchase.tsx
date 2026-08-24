'use client';
import { useState, useEffect, useMemo } from "react";
import * as Icons from "lucide-react";
import { EventModel } from '../../types';
import { useUmi } from "../../components/providers";
import { buildBuyTicketInstruction, deriveEventPDA } from "../../lib/event-pda";
import { address } from "@solana/addresses";
import { transactionBuilder } from "@metaplex-foundation/umi";
import { type Address, createSolanaRpc } from "@solana/kit";
import { useActiveSolanaWallet } from "../../hooks/useActiveSolanaWallet";
import WalletButton from "../../components/ui/WalletButton";
import AlertModal, { AlertModalProps } from "../../components/ui/AlertModal";
import { LandingNavBar } from "../../components/layout/LandingNavBar";
import { LandingFooter } from "../../components/layout/LandingFooter";



const calculateFee = (price: number) => price * 0.05;


export default function BuyerPurchase({
  event,
  collectionMint,
  ownedTicketsCount = 0,
  onBeforeMint,
  onCancelMint,
  onSuccessMint,
  onBack,
  onGoToMyTicket,
}: {
  event: EventModel;
  collectionMint: string;
  ownedTicketsCount?: number;
  onBeforeMint?: (mints: string[], eventPda: string) => Promise<void>;
  onCancelMint?: (mints: string[]) => Promise<void>;
  onSuccessMint: (mintInfos: string[], qty: number) => void;
  onBack: () => void;
  onGoToMyTicket: (mint?: string) => void;
}) {
  const umi = useUmi();
  const { walletAddress: walletAddressStr, authenticated, user } = useActiveSolanaWallet();
  const devnetUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const rpcRaw = useMemo(() => createSolanaRpc(devnetUrl), [devnetUrl]);

  const [screen, setScreen] = useState<'buy' | 'checkout' | 'wallet-checkout' | 'processing' | 'success'>('buy');
  const [paymentMethod, setPaymentMethod] = useState<'tarjeta' | 'blink' | 'wallet'>('wallet');
  const [qty, setQty] = useState(1);
  const [progressStep, setProgressStep] = useState(0);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [onChainZones, setOnChainZones] = useState<any[] | null>(null);
  const [mintedTickets, setMintedTickets] = useState<string[]>([]);

  const walletAddress: Address | null = walletAddressStr ? (walletAddressStr as Address) : null;
  const walletConnected = authenticated || !!walletAddressStr;

  const [alertConfig, setAlertConfig] = useState<AlertModalProps>({
    isOpen: false, title: '', message: '', type: 'info',
    onClose: () => setAlertConfig(p => ({ ...p, isOpen: false }))
  });

  const showAlert = (title: string, message: string, type: AlertModalProps['type']) => {
    setAlertConfig(prev => ({ ...prev, isOpen: true, title, message, type }));
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    async function loadOnChainStats() {
      if (!collectionMint || !event.organizerWallet) return;
      try {
        const { Connection, PublicKey } = await import("@solana/web3.js");
        const { fetchEventRecord } = await import("../../lib/anchor");
        const conn = new Connection(devnetUrl, "confirmed");
        const [eventPdaStr] = await deriveEventPDA(address(event.organizerWallet), address(collectionMint));
        const record = await fetchEventRecord(conn, new PublicKey(eventPdaStr));
        if (record && record.zones) {
          setOnChainZones(record.zones);
        }
      } catch (e) {
        console.warn("No se pudo cargar estado on-chain", e);
      }
    }
    loadOnChainStats();
  }, [collectionMint, event.organizerWallet, devnetUrl]);

  const liveTotalSold = onChainZones ? onChainZones.reduce((acc, z) => acc + (z.ticketsSold || 0), 0) : event.sold;
  const available = event.total - liveTotalSold;

  let maxAllowed = 4;
  if (event.limitPerWallet) {
    maxAllowed = Math.max(0, event.limitPerWallet - ownedTicketsCount);
  }

  useEffect(() => {
    if (maxAllowed === 0 && qty !== 0) setQty(0);
    else if (maxAllowed > 0 && qty === 0) setQty(1);
    else if (qty > maxAllowed) setQty(maxAllowed);
  }, [maxAllowed, qty]);

  const pctSold = Math.round((liveTotalSold / event.total) * 100);
  const progressBarColor = pctSold > 85
    ? 'bg-gradient-to-r from-[#E24B4A] to-[#ff6b6b]'
    : pctSold > 50
      ? 'bg-gradient-to-r from-[#FAC775] to-[#F0997B]'
      : 'bg-gradient-to-r from-[#1D9E75] to-[#5DCAA5]';

  const activePrice = event.zones && event.zones.length > 0 ? event.zones[selectedZoneIndex].price : event.price;
  const activeAvailable = onChainZones && onChainZones[selectedZoneIndex] 
    ? onChainZones[selectedZoneIndex].capacity - onChainZones[selectedZoneIndex].ticketsSold 
    : (event.zones && event.zones.length > 0 ? event.zones[selectedZoneIndex].capacity : available);

  const changeQty = (delta: number) => {
    setQty(prev => Math.max(1, Math.min(maxAllowed, Math.min(activeAvailable, prev + delta))));
  };

  const startPurchase = async () => {
    if (!walletConnected) {
      showAlert("Wallet Desconectada", "Conecta tu cuenta (paso 1) para asegurar tu entrada digital.", "warning");
      return;
    }
    if (!collectionMint) {
      showAlert("Demo Temporal", "Este evento es una demostración. El organizador aún no ha lanzado el sistema de seguridad oficial.", "info");
      return;
    }

    setScreen('processing');
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= 3) setProgressStep(step);
    }, 900);

    const pendingMints: string[] = [];
    const successfulMints: string[] = [];

    try {
      if (!event.organizerWallet) {
        throw new Error("El evento no tiene configurada la wallet del organizador.");
      }
      const organizerAddr = address(event.organizerWallet);
      const [eventRecordPda] = await deriveEventPDA(organizerAddr, collectionMint);
      
      const { EVENT_REGISTRY_PROGRAM_ID } = await import("../../lib/anchor");
      const { getProgramDerivedAddress, getAddressEncoder } = await import("@solana/addresses");
      const encoder = getAddressEncoder();
      
      const escrowStatePda = (await getProgramDerivedAddress({
        programAddress: EVENT_REGISTRY_PROGRAM_ID,
        seeds: [Buffer.from("escrow_state"), encoder.encode(eventRecordPda)]
      }))[0];


      for (let i = 0; i < qty; i++) {
        const { generateSigner } = await import("@metaplex-foundation/umi");
        const ticketMintSigner = generateSigner(umi);
        
        const { instruction } = await buildBuyTicketInstruction(
          address(walletAddress!),
          eventRecordPda,
          organizerAddr,
          address(collectionMint),
          address(ticketMintSigner.publicKey.toString()),
          selectedZoneIndex,
          event.ticketImage || event.coverImage || "https://metadata.mintpass.app/ticket"
        );

        let finalTx = transactionBuilder().add({
          instruction: instruction,
          signers: [umi.identity, ticketMintSigner],
          bytesCreatedOnChain: 0
        });

        const ticketMintPubkey = ticketMintSigner.publicKey.toString();
        pendingMints.push(ticketMintPubkey);

        // Guardar el ticket en la BD como PENDING_ON_CHAIN antes de firmar
        if (onBeforeMint) {
          await onBeforeMint([ticketMintPubkey], eventRecordPda);
        }

        await finalTx.sendAndConfirm(umi);
        successfulMints.push(ticketMintPubkey);
      }

      clearInterval(interval);
      setProgressStep(4);
      setMintedTickets(successfulMints);

      // Inicialización de metadatos eliminada: ¡Ahora se hace directamente on-chain en el contrato al mintear!

      onSuccessMint(successfulMints, qty);
      setTimeout(() => setScreen('success'), 600);
    } catch (e: unknown) {
      console.error(e);
      clearInterval(interval);
      
      // Cleanup de tickets en BD si el usuario canceló la transacción
      if (onCancelMint) {
        const failedMints = pendingMints.filter(m => !successfulMints.includes(m));
        if (failedMints.length > 0) {
          onCancelMint(failedMints).catch(console.error);
        }
      }

      let errorString = e instanceof Error ? e.message : String(e);
      
      // Intentar extraer el mensaje de Anchor de los logs
      if (e && typeof e === 'object' && 'logs' in e && Array.isArray((e as any).logs)) {
        const logsStr = (e as any).logs.join(' ');
        if (logsStr.includes("límite de boletos permitidos") || logsStr.includes("0x1791")) {
          errorString = "Has excedido el límite de boletos permitidos para esta cuenta.";
        } else if (logsStr.includes("Error Message:")) {
          const match = logsStr.match(/Error Message: (.*?)\./);
          if (match && match[1]) errorString = match[1];
        }
      } else if (errorString.includes("0x1791") || errorString.includes("límite de boletos")) {
        errorString = "Has excedido el límite de boletos permitidos para esta cuenta.";
      }

      if (successfulMints.length > 0) {
        // Compra parcial exitosa
        setMintedTickets(successfulMints);
        // Inicialización de metadatos eliminada: ¡Ahora se hace directamente on-chain en el contrato al mintear!
        onSuccessMint(successfulMints, successfulMints.length);
        showAlert(
          "Compra Parcial", 
          `Se generaron ${successfulMints.length} boleto(s) exitosamente, pero el resto falló:\n${errorString}`, 
          "warning"
        );
        setTimeout(() => setScreen('success'), 3000);
      } else {
        showAlert("Error de Compra", "La compra no pudo ser procesada:\n" + errorString, "error");
        setScreen('buy');
      }
    }
  };

  const EventIcon = (Icons as any)[event.icon] || Icons.HelpCircle;

  return (
    <div className="lp-container relative">
      {['buy', 'checkout', 'wallet-checkout', 'processing'].includes(screen) ? (
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
                  <div className="bp-img-main" style={{ background: event.bg, borderRadius: event.gallery && event.gallery.length > 0 ? '16px 0 0 16px' : '16px' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${event.coverImage || 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=800&auto=format&fit=crop'}")`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: event.coverImage ? 1 : 0.8, mixBlendMode: event.coverImage ? 'normal' : 'overlay' }}></div>
                    {!event.coverImage && <EventIcon size={64} color="#ffffff" style={{ position: 'relative', zIndex: 10, opacity: 0.9 }} />}
                  </div>
                  {event.gallery && event.gallery.length > 0 && (
                    <div className="bp-img-col">
                      {event.gallery.slice(0, 2).map((url, idx) => (
                        <div key={idx} className="bp-img-sub" style={{ background: '#2C2C2A', borderRadius: event.gallery!.length === 1 ? '0 16px 16px 0' : (idx === 0 ? '0 16px 0 0' : '0 0 16px 0'), backgroundImage: `url("${url}")`, backgroundPosition: 'center', backgroundSize: 'cover', height: event.gallery!.length === 1 ? '100%' : undefined }}></div>
                      ))}
                    </div>
                  )}
                </div>

                {event.description && (
                  <>
                    <p className="bp-h3">Sobre el evento</p>
                    <p className="bp-p whitespace-pre-wrap">{event.description}</p>
                  </>
                )}

                {(event.venue || event.city || event.state || event.country) && (
                  <>
                    <p className="bp-h3">Ubicación</p>
                    <div className="bp-info-row">
                      <div className="bp-info-icon">
                        <Icons.MapPin size={24} color="#D3D1C7" />
                      </div>
                      <div>
                        <p className="bp-info-title">{event.venue || "Ubicación por definir"}</p>
                        <p className="bp-info-sub">{[event.city, event.state, event.country].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>
                  </>
                )}

                {(event.doorTime || event.ageRestriction || event.contactEmail) && (
                  <p className="bp-h3">Detalles Adicionales</p>
                )}
                {event.doorTime && (
                  <div className="bp-info-row" style={{ marginBottom: '12px' }}>
                    <div className="bp-info-icon">
                      <Icons.Clock size={20} color="#D3D1C7" />
                    </div>
                    <div>
                      <p className="bp-info-title">Apertura de puertas</p>
                      <p className="bp-info-sub">{event.doorTime}</p>
                    </div>
                  </div>
                )}
                {event.ageRestriction && (
                  <div className="bp-info-row">
                    <div className="bp-info-icon">
                      <Icons.UserCheck size={20} color="#D3D1C7" />
                    </div>
                    <div>
                      <p className="bp-info-title">Clasificación</p>
                      <p className="bp-info-sub">{event.ageRestriction}</p>
                    </div>
                  </div>
                )}
                <div className="bp-info-row" style={{ marginTop: '12px' }}>
                  <div className="bp-info-icon">
                    <Icons.PhoneCall size={20} color="#D3D1C7" />
                  </div>
                  <div>
                    <p className="bp-info-title">Contacto de Soporte</p>
                    <p className="bp-info-sub">mintpass.sol@gmail.com</p>
                  </div>
                </div>

                <p className="bp-h3" style={{ marginTop: '32px' }}>Reglas de tu entrada</p>
                <div className="bp-info-row" style={{ marginBottom: '12px' }}>
                  <div className="bp-info-icon">
                    <Icons.RefreshCcw size={20} color="#D3D1C7" />
                  </div>
                  <div>
                    <p className="bp-info-title">¿Si no puedes asistir?</p>
                    <p className="bp-info-sub" style={{ color: event.allowRefunds ? '#27500A' : '#E24B4A' }}>
                      {event.allowRefunds ? `Puedes cancelar y recuperar tu dinero hasta ${event.refundTimeLimit} días antes del evento.` : 'Para este evento no hay reembolsos.'}
                    </p>
                  </div>
                </div>
                <div className="bp-info-row">
                  <div className="bp-info-icon">
                    <Icons.Repeat size={20} color="#D3D1C7" />
                  </div>
                  <div>
                    <p className="bp-info-title">Pasar tu boleto</p>
                    <p className="bp-info-sub">
                      {event.allowResale ? `Puedes venderlo a alguien más de forma segura (tope máximo del ${event.resaleCapLimit}% de lo que pagaste).` : 'Tu entrada es 100% tuya y no se puede transferir a nadie más.'}
                    </p>
                  </div>
                </div>

                <p className="bp-h3" style={{ marginTop: '32px' }}>Organizado por</p>
                <div className="bp-org-card">
                  <div className="bp-org-avatar">
                    <Icons.User size={20} color="#FFFFFF" />
                  </div>
                  <div>
                    <p className="bp-info-title">{event.companyName || "Organizador Oficial"}</p>
                    <p className="bp-info-sub" style={{ margin: '2px 0 0', fontSize: '12px', color: '#14F195', fontWeight: 600 }}>
                      <Icons.ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Verificado por Mintpass
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (Sticky Purchase Card) */}
              <div className="bp-right-col">
                {event.status === 'CANCELLED' ? (
                  <div className="bp-card bp-card-pad" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#DC2626', marginBottom: '16px' }}>
                      <Icons.AlertTriangle size={24} />
                      <p className="bp-h3" style={{ margin: 0, color: '#DC2626' }}>Evento Cancelado</p>
                    </div>
                    <p style={{ fontSize: '14px', color: '#991B1B', lineHeight: 1.5, margin: 0 }}>
                      Este evento ha sido cancelado por el organizador. La venta de boletos está deshabilitada y el contrato inteligente procesará los reembolsos pertinentes según los términos de Mintpass.
                    </p>
                  </div>
                ) : event.isEventPast || event.status === 'CLOSED' ? (
                  <div className="bp-card bp-card-pad" style={{ background: '#F3F4F6', border: '1px solid #D1D5DB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#374151', marginBottom: '16px' }}>
                      <Icons.Clock size={24} />
                      <p className="bp-h3" style={{ margin: 0, color: '#374151' }}>Venta Finalizada</p>
                    </div>
                    <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: 1.5, margin: 0 }}>
                      Este evento ya se llevó a cabo o las ventas han sido cerradas. Ya no es posible adquirir boletos.
                    </p>
                  </div>
                ) : screen === 'buy' ? (
                  <div className="bp-card bp-card-pad">
                    <p className="bp-h3" style={{ fontSize: '18px', marginBottom: '16px' }}>Elige tus boletos</p>
                    
                    <div className="bp-stage-label">ESCENARIO</div>

                    {event.zones && event.zones.length > 0 ? (
                      event.zones.map((zone, idx) => {
                        const isSelected = selectedZoneIndex === idx;
                        const onChainZone = onChainZones ? onChainZones[idx] : null;
                        const zoneAvailable = onChainZone ? onChainZone.capacity - onChainZone.ticketsSold : zone.capacity;
                        const isAvailable = zoneAvailable > 0;
                        return (
                          <div key={idx} className={`bp-zone-item ${isAvailable ? (isSelected ? 'active' : '') : 'disabled'}`} onClick={() => isAvailable && setSelectedZoneIndex(idx)} style={{ cursor: isAvailable ? 'pointer' : 'not-allowed', border: isSelected ? '2px solid #14F195' : '1px solid #EAEAEA', transition: 'all 0.2s', opacity: isAvailable ? 1 : 0.6 }}>
                            <div>
                              <p className="bp-zone-title">{zone.name}</p>
                              <p className="bp-zone-sub" style={{ color: isAvailable ? '#27500A' : '#E24B4A' }}>
                                {isAvailable ? `${zoneAvailable} lugares disponibles` : 'Agotado'}
                              </p>
                            </div>
                            <p className="bp-zone-price">
                              {zone.price === 0 ? 'Gratis' : `${zone.price} SOL`}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bp-zone-item active" style={{ border: '2px solid #14F195' }}>
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
                    )}

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

                    {activePrice > 0 && activeAvailable > 0 && (
                      <div className="bp-total-row">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#5F5E5A' }}>
                            <span>Boletos ({qty})</span>
                            <span>{(qty * activePrice).toFixed(3)} SOL</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#5F5E5A' }}>
                            <span>Tarifa Mintpass</span>
                            <span>{(qty * calculateFee(activePrice)).toFixed(3)} SOL</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                            <span style={{ fontSize: '14px', color: '#1E1E1E', fontWeight: 600 }}>Total a Pagar</span>
                            <span style={{ fontSize: '18px', fontWeight: 600, color: '#1E1E1E' }}>{((activePrice + calculateFee(activePrice)) * qty).toFixed(3)} SOL</span>
                          </div>
                        </div>
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
                        <span>{qty} boleto{qty > 1 ? 's' : ''} general</span>
                        <span className="bp-text-dark font-mono font-medium">{(qty * activePrice).toFixed(4)} SOL</span>
                      </div>
                      <div className="flex justify-between items-center text-[13px] text-gray-500 mb-2">
                        <span>Fee de Plataforma (5%)</span>
                        <span>{(qty * activePrice * 0.05).toFixed(4)} SOL</span>
                      </div>
                      <div className="flex justify-between items-center text-[13px] text-gray-500 mb-2">
                        <span>Costo de procesamiento</span>
                        <span>Calculado por tu wallet</span>
                      </div>
                      <div className="flex justify-between items-center text-[15px] font-bold text-gray-900 border-t border-gray-200 pt-3 mt-3">
                        <span>Total a Pagar <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#6B7280', marginLeft: '4px' }}>(más procesamiento)</span></span>
                        <span>{((activePrice + calculateFee(activePrice)) * qty).toFixed(4)} SOL</span>
                      </div>
                    </div>

                    <div style={{ margin: '0 18px 12px', fontSize: '12px', color: '#5F5E5A', fontWeight: 500 }}>Método de pago</div>
                    <div className="bp-wallet-opts">
                      <div 
                        onClick={() => setPaymentMethod('tarjeta')} 
                        className={`bp-wallet-opt ${paymentMethod === 'tarjeta' ? 'selected' : ''}`}
                      >MercadoPago</div>
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
                ) : screen === 'wallet-checkout' ? (
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
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#5F5E5A' }}>Resumen de compra</p>
                      <div className="bp-summary-row">
                        <span>Boletos ({qty})</span><span>{(qty * activePrice).toFixed(4)} SOL</span>
                      </div>
                      <div className="bp-summary-row">
                        <span>Cargo de servicio Mintpass (5%)</span><span>{(qty * activePrice * 0.05).toFixed(4)} SOL</span>
                      </div>
                      <div className="bp-summary-row" style={{ color: '#8A8880', fontSize: '12px' }}>
                        <span>Costo de procesamiento</span>
                        <span style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span>Calculado por tu wallet</span>
                          <span style={{ fontSize: '10px', opacity: 0.8 }}>(Al confirmar el pago)</span>
                        </span>
                      </div>
                      <div className="bp-summary-row" style={{ color: '#3C3489' }}>
                        <span>Tope seguro si decides revenderlo</span><span>{event.allowResale ? `Máximo al ${event.resaleCapLimit}%` : 'Intransferible'}</span>
                      </div>
                      <div className="bp-summary-total">
                        <span>Total a pagar <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#8A8880', marginLeft: '4px' }}>(más procesamiento)</span></span>
                        <span>{((activePrice + calculateFee(activePrice)) * qty).toFixed(4)} SOL</span>
                      </div>
                    </div>

                    <div className="bp-alert-box">
                      <Icons.ShieldCheck style={{ fontSize: '20px', color: '#3C3489' }} />
                      <p style={{ margin: 0, fontSize: '11px', color: '#3C3489', lineHeight: 1.4 }}>
                        Compra directa sin intermediarios protegida por <b>Privy</b>. Tu boleto digital es a prueba de falsificaciones.
                      </p>
                    </div>

                    <div style={{ margin: '4px 18px 6px' }}>
                      <button 
                        onClick={() => {
                          if (!walletConnected) {
                            showAlert("Conecta tu cuenta", "Por favor conecta tu cuenta mediante Privy usando el botón superior antes de continuar.", "info");
                          } else {
                            startPurchase();
                          }
                        }}
                        className="bp-btn-primary"
                      >
                        Autorizar pago
                      </button>
                    </div>
                    <div style={{ margin: '0 18px 20px', textAlign: 'center', fontSize: '11px', color: '#5F5E5A' }}>
                      Pagos directos P2P. Independiente de pasarelas bancarias.
                    </div>
                  </div>
                ) : screen === 'processing' ? (
                  <div className="bp-card" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px' }}>
                      <div style={{ position: 'absolute', inset: 0, border: '4px solid #D3D1C7', borderRadius: '50%' }}></div>
                      <div style={{ position: 'absolute', inset: 0, border: '4px solid #1E1E1E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <div style={{ position: 'absolute', inset: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', borderRadius: '50%', border: '1px solid #D3D1C7', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                        <Icons.Loader size={24} color="#1E1E1E" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                      </div>
                    </div>

                    <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#1E1E1E' }}>Autorizando acceso</h2>
                    <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#5F5E5A' }}>Procesando de forma segura tu compra...</p>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { step: 1, label: 'Verificando Wallet' },
                        { step: 2, label: 'Autorizando pago' },
                        { step: 3, label: 'Generando activo digital' },
                        { step: 4, label: 'Asegurando Boletos' }
                      ].map((s) => {
                        const status = progressStep > s.step ? 'done' : progressStep === s.step ? 'active' : 'todo';
                        return (
                          <div key={s.step} className="bp-step" style={{ 
                            background: status === 'todo' ? 'rgba(255,255,255,0.5)' : '#FFFFFF',
                            borderColor: status === 'active' ? '#1E1E1E' : '#D3D1C7',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            borderRadius: '12px'
                          }}>
                            <div style={{ 
                              width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              background: status === 'done' ? 'rgba(20,241,149,0.2)' : status === 'active' ? '#1E1E1E' : '#F7F8F7',
                              border: `1px solid ${status === 'done' ? '#14F195' : status === 'active' ? '#1E1E1E' : '#D3D1C7'}`,
                              color: status === 'done' ? '#27500A' : status === 'active' ? '#FFFFFF' : '#A1A1AA'
                            }}>
                              {status === 'done' ? <Icons.Check size={12} strokeWidth={3} /> :
                               status === 'active' ? <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFFFFF', animation: 'pulse 2s infinite' }}></div> :
                               <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{s.step}</span>}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.025em', color: status === 'todo' ? '#5F5E5A' : '#1E1E1E' }}>
                              {s.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
          <LandingFooter />
        </main>
      ) : null}





      {/* SUCCESS SCREEN */}
      {screen === 'success' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#F1EFE8] animate-in fade-in zoom-in-95 duration-500 rounded-[12px]">
          <div className="w-[88px] h-[88px] rounded-full bg-[#14F195]/20 border border-[#14F195] flex items-center justify-center mb-6 shadow-[0_4px_24px_rgba(20,241,149,0.3)]">
            <Icons.Check size={44} className="text-[#27500A]" />
          </div>

          <h2 className="text-[28px] font-bold text-[#1E1E1E] mb-2 tracking-tight">Acceso Concedido</h2>
          <p className="text-[14px] text-[#5F5E5A] mb-10 font-medium tracking-wide">
            {mintedTickets.length > 1 ? `Tus ${mintedTickets.length} boletos digitales están asegurados y listos` : 'Tu boleto digital está asegurado y listo'}
          </p>

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
                {event.name} <span className="text-[#A1A1AA] ml-1">#{liveTotalSold + 1}</span>
              </h3>

              <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-[#F7F8F7] border border-[#D3D1C7] px-3 py-1.5 rounded-[8px] text-[11px] font-medium text-[#1E1E1E]">{event.date}</span>
                <span className="bg-[#F7F8F7] border border-[#D3D1C7] px-3 py-1.5 rounded-[8px] text-[11px] font-medium text-[#1E1E1E]">{event.venue}</span>
              </div>
            </div>

            <div className="absolute bottom-[70px] -left-[16px] w-[32px] h-[32px] bg-[#F1EFE8] rounded-full border-r border-[#D3D1C7]"></div>
            <div className="absolute bottom-[70px] -right-[16px] w-[32px] h-[32px] bg-[#F1EFE8] rounded-full border-l border-[#D3D1C7]"></div>
            <div className="absolute bottom-[86px] left-8 right-8 h-px border-t-[2px] border-dashed border-[#D3D1C7] opacity-50"></div>
            
            <div className="px-6 pb-6 pt-4 text-left">
              <p className="text-[10px] text-[#8A8880] uppercase tracking-wider mb-2 font-semibold">Certificado de Autenticidad</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-[#F7F8F7] p-2 rounded-md border border-[#E8E6DD]">
                  <span className="text-[10px] text-[#5F5E5A] font-medium">Boleto Seguro</span>
                  <div className="text-right flex flex-col">
                    <a href={`https://explorer.solana.com/address/${mintedTickets[0]}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-[10px] text-[#3C3489] font-mono hover:underline truncate w-[140px]">
                      {mintedTickets[0]?.slice(0,6)}...{mintedTickets[0]?.slice(-6)}
                    </a>
                    {mintedTickets.length > 1 && (
                      <span className="text-[9px] text-[#8A8880] mt-0.5">y {mintedTickets.length - 1} más...</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center bg-[#F7F8F7] p-2 rounded-md border border-[#E8E6DD]">
                  <span className="text-[10px] text-[#5F5E5A] font-medium">Contrato del Evento</span>
                  <a href={`https://explorer.solana.com/address/${collectionMint}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-[10px] text-[#3C3489] font-mono hover:underline truncate w-[140px] text-right">
                    {collectionMint.slice(0,6)}...{collectionMint.slice(-6)}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex max-w-[340px] w-full gap-4">
            <button onClick={() => onGoToMyTicket(mintedTickets.length === 1 ? mintedTickets[0] : undefined)} className="flex-[2] bg-[#1E1E1E] hover:bg-[#333] text-[#FFFFFF] h-[56px] rounded-[16px] font-bold text-[14px] transition-all cursor-pointer shadow-md">
              {mintedTickets.length > 1 ? 'Ver Mis Boletos' : 'Mostrar Boleto'}
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
