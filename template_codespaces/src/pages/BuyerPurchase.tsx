import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { EventModel } from '../types';
import { useUmi } from "../providers";
import { mintTicket, getOrganizerReputation } from "../lib/metaplex";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function BuyerPurchase({ event, collectionMint, ownedTicketsCount = 0, onSuccessMint, onBack, onGoToMyTicket }: { event: EventModel, collectionMint: string, ownedTicketsCount?: number, onSuccessMint: (mint: string, qty: number) => void, onBack: () => void, onGoToMyTicket: () => void }) {
  const umi = useUmi();
  const wallet = useWallet();
  const { connection } = useConnection();

  const [screen, setScreen] = useState<'buy' | 'processing' | 'success'>('buy');
  const [qty, setQty] = useState(1);
  const [progressStep, setProgressStep] = useState(0);
  const [orgReputation, setOrgReputation] = useState<number | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Consulta la reputación del organizador desde la blockchain
  useEffect(() => {
    async function fetchOrgRep() {
      try {
        const score = await getOrganizerReputation(connection, collectionMint || '11111111111111111111111111111111');
        setOrgReputation(score);
      } catch (e) {
        console.warn('No se pudo consultar la reputación del organizador:', e);
        setOrgReputation(0);
      }
    }
    fetchOrgRep();
  }, [connection, collectionMint]);

  // Cálculos de disponibilidad
  const available = event.total - event.sold;

  // Límite estricto por wallet y evento
  let maxAllowed = 4; // Default max per txn
  if (event.limitPerWallet) {
    maxAllowed = Math.max(0, event.limitPerWallet - ownedTicketsCount);
  }

  // Sincronizar qty evitando valores imposibles si alcanzan límite
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

  // Ejecuta el minteo real en la blockchain
  const startPurchase = async () => {
    if (!wallet.publicKey) {
      alert("⚠️ Conecta tu wallet para asegurar tu entrada.");
      return;
    }
    if (!collectionMint) {
      alert("⚠️ Este evento es una demo. El organizador aún no ha lanzado su contrato on-chain.");
      return;
    }

    setScreen('processing');
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= 3) setProgressStep(step);
    }, 900);

    try {
      const ticketMintAddr = await mintTicket(umi, {
        collectionMint,
        buyerWalletObj: wallet as any,
        priceSol: qty * event.price,
        eventData: {
          name: event.name,
          date: event.date,
          venue: event.venue,
          ticketNumber: event.sold + 1,
          imageUrl: "https://lime-accessible-woodpecker-99.mypinata.cloud/ipfs/bafkreic..."
        }
      });
      clearInterval(interval);
      setProgressStep(4);
      onSuccessMint(ticketMintAddr, qty);
      setTimeout(() => setScreen('success'), 600);
    } catch (e: any) {
      console.error(e);
      clearInterval(interval);
      alert("Error en la transacción:\n" + e.message);
      setScreen('buy');
    }
  };

  const EventIcon = (Icons as any)[event.icon] || Icons.HelpCircle;

  // ==================== HELPER: Reputation Label ====================
  const reputationLabel = () => {
    if (orgReputation === null) return <span className="text-[#AFA9EC]">Consultando...</span>;
    if (orgReputation >= 50) return <span className="text-[#5DCAA5] font-bold">⭐ Excelente ({orgReputation} pts)</span>;
    if (orgReputation >= 20) return <span className="text-[#EF9F27] font-bold">👍 Buena ({orgReputation} pts)</span>;
    if (orgReputation > 0)  return <span className="text-[#AFA9EC] font-bold">🆕 Nueva ({orgReputation} pts)</span>;
    return <span className="text-[#666] font-bold">Sin historial</span>;
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#534AB7] selection:text-white bg-[#000000]">
      
      {/* ═══════════════ NAVBAR ═══════════════ */}
      <div className="fixed top-0 w-full z-50 bg-[#000000]/80 backdrop-blur-xl border-b border-[#222] px-6 h-[60px] flex items-center justify-between">
        <button onClick={onBack} className="w-[36px] h-[36px] rounded-full bg-[#111] border border-[#333] text-[#dddddd] flex items-center justify-center hover:bg-[#222] hover:text-white transition-colors cursor-pointer shadow-md z-20 relative">
          <Icons.ChevronLeft size={18} />
        </button>
        <div className="text-[12px] md:text-[13px] font-bold tracking-[0.2em] text-white/90 uppercase text-center w-full absolute left-0 pointer-events-none z-10">
          Asegura tu entrada
        </div>
        <div className="w-[36px] z-20 relative"></div>
      </div>

      {/* ═══════════════ PANTALLA: COMPRAR ═══════════════ */}
      {screen === 'buy' && (
        <div className="flex-1 mt-[60px] w-full grid grid-cols-1 lg:grid-cols-2 relative z-10 overflow-hidden">
          
          {/* ════ COLUMNA IZQUIERDA: Negro absoluto ════ */}
          <div className="bg-[#000000] w-full pt-16 pb-24 px-4 sm:px-8 md:px-12 flex flex-col items-center justify-start border-b lg:border-b-0 lg:border-r border-[#222]">
            <div className="w-full max-w-[440px] flex flex-col gap-6">
              
              {/* Recuadro de imagen */}
              <div className="relative rounded-[24px] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-[#222] aspect-[16/10] bg-[#111] flex flex-col justify-end group mt-2">
                <div className="absolute inset-0 saturate-150 opacity-50 transition-transform duration-1000 group-hover:scale-105" style={{ background: event.bg }}></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-30 mix-blend-overlay">
                  <EventIcon size={100} color="#ffffff" className="drop-shadow-xl" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent"></div>
              </div>

              {/* Información Principal */}
              <div className="flex flex-col gap-3 mt-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[#ffffff]/10 text-white text-[9px] font-black uppercase tracking-[0.2em] w-fit border border-[#333]">
                  <Icons.Star size={10} className={event.icon === 'Music' ? 'text-[#e24b4a]' : 'text-[#AFA9EC]'} /> {event.cat}
                </div>
                <h1 className="text-[32px] md:text-[40px] font-black text-white leading-[1.05] tracking-tight">{event.name}</h1>
                
                {/* Organizador */}
                <div className="flex flex-wrap items-center gap-2 mt-1 px-3 py-1.5 rounded-xl bg-[#111] border border-[#222] text-[11px] w-fit">
                  <Icons.ShieldCheck size={12} className={orgReputation !== null && orgReputation >= 20 ? 'text-[#5DCAA5]' : 'text-[#666]'} />
                  <span className="text-white/60">Organizador:</span>
                  {reputationLabel()}
                </div>
              </div>

              {/* Grid de Detalles (Fecha, Lugar) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div className="flex min-w-0 items-center gap-3 p-3.5 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a]">
                  <div className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center border border-[#222] shrink-0 text-[#AFA9EC]">
                    <Icons.CalendarDays size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] text-[#666] font-bold uppercase tracking-[0.2em] mb-0.5">Día y Hora</span>
                    <span className="text-[13px] font-semibold text-white/90 leading-tight truncate">{event.date}</span>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-3 p-3.5 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a]">
                  <div className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center border border-[#222] shrink-0 text-[#AFA9EC]">
                    <Icons.MapPin size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] text-[#666] font-bold uppercase tracking-[0.2em] mb-0.5">Ubicación</span>
                    <span className="text-[13px] font-semibold text-white/90 leading-tight truncate">{event.venue}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ════ COLUMNA DERECHA: Zona de Compra (Fondo Actual) ════ */}
          <div className="w-full pt-16 pb-24 px-4 sm:px-8 md:px-12 flex flex-col items-center justify-start relative z-20" style={{ background: 'linear-gradient(160deg, #080810 0%, #0a0a20 40%, #10082a 100%)' }}>
            <div className="w-full max-w-[400px] flex flex-col gap-6 mt-2 relative z-30">
              
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] text-center mb-[-4px]">Panel de Compra</div>

              {/* Disponibilidad Compacta */}
              <div className="p-4 sm:p-5 rounded-2xl border border-[#1D9E75]/30 relative overflow-hidden flex flex-col gap-4 shadow-xl" style={{ background: 'linear-gradient(135deg, #0a1a2e 0%, #0d2233 50%, #0a1a20 100%)' }}>
                <div className="absolute -top-[20px] -right-[20px] w-[60px] h-[60px] bg-[#1D9E75]/15 rounded-full blur-[30px] pointer-events-none z-0"></div>
                {pctSold > 85 && <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#E24B4A]/0 via-[#E24B4A] to-[#E24B4A]/0 animate-pulse"></div>}
                
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="text-[9px] text-[#5DCAA5] font-black uppercase tracking-[0.2em] break-words">Disponibilidad</div>
                    {pctSold > 85 ? (
                      <div className="text-[8px] sm:text-[9px] text-[#E24B4A] font-bold bg-[#E24B4A]/15 px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit border border-[#E24B4A]/20">
                        <Icons.Flame size={10} /> ¡Últimos!
                      </div>
                    ) : (
                      <div className="text-[8px] sm:text-[9px] text-[#5DCAA5] font-bold bg-[#5DCAA5]/10 px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit border border-[#5DCAA5]/20">
                        <Icons.Zap size={10} /> Alta demanda
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <div className="text-[22px] sm:text-[24px] font-black text-white leading-[1]">{available}</div>
                    <div className="text-[7px] text-[#5DCAA5]/70 mt-1 font-bold tracking-[0.2em] uppercase">Restantes</div>
                  </div>
                </div>

                <div className="relative z-10 w-full mt-1">
                  <div className="flex justify-between text-[8px] text-[#5DCAA5]/60 font-black mb-1.5 uppercase tracking-widest">
                    <span>Ocupado al {pctSold}%</span>
                    <span>{event.total} total</span>
                  </div>
                  <div className="w-full h-[5px] bg-[#080810] rounded-full overflow-hidden border border-[#1a1a2e]">
                    <div className={`${progressBarColor}`} style={{ height: '100%', borderRadius: '999px', width: `${pctSold}%`, transition: 'width 1s ease' }}></div>
                  </div>
                </div>
              </div>

              {/* Ticket Minimalista de Compra */}
              <div className="relative transform transition-transform duration-300">
                <div className="rounded-3xl overflow-hidden border border-[#3a3a8a]/40 relative shadow-xl" style={{ background: 'linear-gradient(145deg, #12122a 0%, #17173e 100%)' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-[#7F77DD]/60 to-transparent"></div>

                  <div className="p-5 border-b-[2px] border-dashed border-[#2a2a4a]/80 relative text-center">
                    <div className="absolute bottom-[-14px] -left-[14px] w-[28px] h-[28px] bg-[#0a0a1a] rounded-full border-r-[2px] border-dashed border-[#2a2a4a] z-10 shadow-inner"></div>
                    <div className="absolute bottom-[-14px] -right-[14px] w-[28px] h-[28px] bg-[#0a0a1a] rounded-full border-l-[2px] border-dashed border-[#2a2a4a] z-10 shadow-inner"></div>
                    
                    <div className="text-[9px] text-[#AFA9EC] font-bold tracking-[0.2em] uppercase mb-1.5">Precio por Entrada</div>
                    <div className="text-[32px] font-black leading-none drop-shadow-md" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #d0c8ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {event.price === 0 ? 'Gratis' : `${event.price} SOL`}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col items-center">
                    <div className="text-[9px] text-[#AFA9EC]/70 mb-3 font-bold uppercase tracking-[0.2em] text-center">Cantidad de Boletos</div>
                    <div className="flex items-center gap-4 bg-[#080810]/80 border border-[#3a3a8a]/40 rounded-[16px] p-2 shadow-inner w-full justify-center">
                      <button onClick={() => changeQty(-1)} className="w-[36px] h-[36px] rounded-xl flex items-center justify-center hover:bg-[#534AB7]/20 text-[#888] hover:text-[#AFA9EC] transition-colors"><Icons.Minus size={18} /></button>
                      <div className="text-[24px] font-black text-white min-w-[32px] text-center">{qty}</div>
                      <button onClick={() => changeQty(1)} className="w-[36px] h-[36px] rounded-xl flex items-center justify-center hover:bg-[#534AB7]/20 text-[#888] hover:text-[#AFA9EC] transition-colors"><Icons.Plus size={18} /></button>
                    </div>

                    {event.price > 0 && (
                      <div className="mt-4 w-full flex items-center justify-between bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-xl px-4 py-2.5">
                        <span className="text-[10px] font-bold text-[#5DCAA5]/80 uppercase tracking-widest">Subtotal</span>
                        <span className="text-[16px] font-black text-[#5DCAA5]">{(qty * event.price).toFixed(3)} SOL</span>
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>

              {/* Botones Consolidados (Wallet & Buy) */}
              <div className="flex flex-col items-center gap-3">
                {!wallet.publicKey ? (
                  <div className="w-full flex flex-col items-center gap-2.5">
                    <div className="text-[9px] font-bold text-[#AFA9EC]/60 uppercase tracking-[0.2em] text-center">Paso 1: Conecta tu Wallet</div>
                    <WalletMultiButton style={{ width: '100%', justifyContent: 'center', height: '48px', borderRadius: '16px', fontSize: '13px', fontWeight: 'bold' }} />
                  </div>
                ) : (
                  <button 
                    onClick={startPurchase} 
                    disabled={available <= 0 || maxAllowed <= 0}
                    className="w-full relative group overflow-hidden rounded-[16px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-shadow duration-300"
                    style={{ boxShadow: (available > 0 && maxAllowed > 0) ? '0 8px 25px rgba(83,74,183,0.3)' : 'none' }}
                  >
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #534AB7 35%, #7C3AED 65%, #E879A8 100%)' }}></div>
                    <div className="absolute inset-y-0 -left-[100%] w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-1000 ease-in-out"></div>
                    
                    <div className="relative h-[56px] flex items-center justify-center gap-2 px-6">
                      <span className="text-[14px] font-black text-white tracking-widest drop-shadow-md">
                        {maxAllowed <= 0 ? 'LÍMITE ALCANZADO' : available <= 0 ? 'AGOTADO' : event.price === 0 ? 'DESBLOQUEAR TICKET' : `PROCESAR COMPRA`}
                      </span>
                      {(available > 0 && maxAllowed > 0) && <Icons.ArrowRight size={18} className="text-white/80 group-hover:translate-x-1 transition-transform" />}
                    </div>
                  </button>
                )}
                <div className="text-center flex items-center justify-center gap-1.5 text-[8px] text-[#5DCAA5]/60 font-bold tracking-[0.2em] uppercase mt-1">
                  <Icons.ShieldCheck size={10} /> Solicitud Segura Real
                </div>
              </div>

              {/* Beneficios */}
              <div className="mt-1">
                <div className="text-[9px] font-bold text-[#AFA9EC]/70 uppercase tracking-[0.2em] mb-3 text-center">¿Qué incluye tu acceso?</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Icons.QrCode,     label: 'QR NFT',     sub: 'Token Verificado',    border: '#3B82F6', text: '#60A5FA', bg: '#0d1025' },
                    { icon: Icons.Wallet,      label: 'On-chain',  sub: 'Propiedad Real',  border: '#1D9E75', text: '#5DCAA5', bg: '#0a1a18' },
                    { icon: Icons.Nfc,         label: 'NFC Ready',       sub: 'Acceso Rápido', border: '#FAC775', text: '#FAC775', bg: '#1a1508' },
                    { icon: Icons.BadgeCheck,  label: 'POAP',      sub: 'Coleccionable',  border: '#E879A8', text: '#E879A8', bg: '#1a0d18' },
                  ].map((b, i) => (
                    <div key={i} className="rounded-2xl p-3 flex flex-col items-center text-center shadow-lg bg-[#080814] border border-[#2a2a4a]/50 hover:border-[#3a3a8a] transition-all duration-300">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1.5" style={{ background: `${b.border}15`, color: b.text }}>
                        <b.icon size={14} />
                      </div>
                      <div className="text-[11px] font-black text-white mb-0.5">{b.label}</div>
                      <div className="text-[8px] font-medium text-[#888]">{b.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ PANTALLA: PROCESAMIENTO ═══════════════ */}
      {screen === 'processing' && (
        <div className="min-h-screen flex items-center justify-center px-5 flex-col absolute inset-0 z-50 animate-in fade-in duration-500 bg-[#000]">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-[4px] border-[#1a1a2e] rounded-full"></div>
            <div className="absolute inset-0 border-[4px] border-[#534AB7] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d1e] rounded-full m-1 border border-[#1a1a2e] shadow-[0_0_30px_rgba(83,74,183,0.4)]">
              <Icons.Loader size={28} className="text-[#7F77DD] animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-[24px] font-semibold text-white mb-2 tracking-tight">Autorizando acceso</h2>
          <p className="text-[14px] text-[#888] mb-12">No cierres esta pantalla. Interactuando con Solana...</p>
          
          <div className="w-full max-w-[340px] flex flex-col gap-3">
            {[
              { step: 1, label: 'Verificando Wallet' },
              { step: 2, label: 'Firmando transacción' },
              { step: 3, label: 'Generando activo digital' },
              { step: 4, label: 'Confirmación On-Chain' }
            ].map((s) => (
              <div key={s.step} className={`flex items-center gap-4 p-4 rounded-[16px] border transition-all duration-500 ${progressStep === s.step ? 'bg-[#12122a] border-[#534AB7] shadow-[0_0_15px_rgba(83,74,183,0.15)]' : 'bg-[#0d0d1e] border-[#1a1a2e]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-300 ${
                  progressStep > s.step ? 'bg-[#1D9E75]/20 border-[#1D9E75]/30 text-[#5DCAA5]' : 
                  progressStep === s.step ? 'bg-[#534AB7]/20 border-[#534AB7] text-[#AFA9EC]' : 'bg-[#080810] border-[#2a2a4a] text-[#555]'
                }`}>
                  {progressStep > s.step ? <Icons.Check size={14} strokeWidth={3} /> : 
                   progressStep === s.step ? <div className="w-2 h-2 rounded-full bg-[#AFA9EC] animate-pulse"></div> : 
                   <span className="text-[12px] font-bold">{s.step}</span>}
                </div>
                <div className={`text-[14px] font-medium tracking-wide ${progressStep >= s.step ? (progressStep === s.step ? 'text-white' : 'text-[#AFA9EC]') : 'text-[#666]'}`}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ PANTALLA: ÉXITO ═══════════════ */}
      {screen === 'success' && (
        <div className="min-h-[100vh] flex items-center justify-center px-5 flex-col absolute inset-0 z-50 animate-in fade-in zoom-in-95 duration-500 bg-[#000]">
          <div className="w-[88px] h-[88px] rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(29,158,117,0.2)]">
            <Icons.Check size={44} className="text-[#5DCAA5]" />
          </div>
          
          <h2 className="text-[28px] font-bold text-white mb-2 tracking-tight">Acceso Concedido</h2>
          <p className="text-[14px] text-[#AFA9EC] mb-10 font-medium tracking-wide">Tu ticket NFT fue minteado exitosamente</p>
          
          {/* Tarjeta de ticket */}
          <div className="max-w-[340px] w-full bg-[#0d0d1e] border border-[#2a2a4a] rounded-[32px] overflow-hidden mb-8 relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform rotate-[-1deg] hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="h-[140px] flex items-center justify-center relative" style={{ background: event.bg }}>
               <EventIcon size={56} color={event.color} className="drop-shadow-2xl" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1e] via-transparent to-transparent"></div>
            </div>
            
            <div className="p-6 relative text-center">
              <div className="absolute -top-[24px] right-6 w-[48px] h-[48px] bg-[#080810] rounded-full flex items-center justify-center border border-[#1a1a2e] shadow-lg z-10">
                <Icons.QrCode size={20} className="text-[#5DCAA5]" />
              </div>
              
              <div className="inline-block px-3 py-1 bg-[#1a1a2e] rounded-md text-[10px] text-[#AFA9EC] font-mono tracking-widest uppercase mb-3 border border-[#2a2a4a]">
                MINT PASS · SOLANA
              </div>
              
              <h3 className="text-[20px] font-bold text-white mb-4 leading-tight">
                {event.name} <span className="text-[#555] ml-1">#{event.sold + 1}</span>
              </h3>
              
              <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-[#12122a] border border-[#1a1a2e] px-3 py-1.5 rounded-[10px] text-[11px] font-medium text-[#ddd]">{event.date}</span>
                <span className="bg-[#12122a] border border-[#1a1a2e] px-3 py-1.5 rounded-[10px] text-[11px] font-medium text-[#ddd]">{event.venue}</span>
              </div>
            </div>
            
            {/* Cortes laterales del ticket */}
            <div className="absolute bottom-[70px] -left-[16px] w-[32px] h-[32px] bg-[#080810] rounded-full border-r border-[#2a2a4a]"></div>
            <div className="absolute bottom-[70px] -right-[16px] w-[32px] h-[32px] bg-[#080810] rounded-full border-l border-[#2a2a4a]"></div>
            <div className="absolute bottom-[86px] left-8 right-8 h-px border-t-[2px] border-dashed border-[#2a2a4a] opacity-50"></div>
          </div>
          
          <div className="flex max-w-[340px] w-full gap-4">
            <button onClick={onGoToMyTicket} className="flex-[2] bg-[#5DCAA5] hover:bg-[#4eb392] text-[#085041] h-[56px] rounded-[20px] font-bold text-[15px] transition-all cursor-pointer shadow-[0_0_20px_rgba(29,158,117,0.3)]">
              Mostrar QR
            </button>
            <button onClick={onBack} className="flex-1 bg-[#1a1a2e] hover:bg-[#2a2a4a] text-white h-[56px] rounded-[20px] font-semibold text-[14px] transition-colors cursor-pointer border border-[#2a2a4a]">
              Inicio
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
