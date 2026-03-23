import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { EventModel } from '../types';

export default function BuyerPurchase({ event, onBack, onGoToMyTicket }: { event: EventModel, onBack: () => void, onGoToMyTicket: () => void }) {
  // Manejo de pantallas internas (flujo de compra)
  const [screen, setScreen] = useState<'buy' | 'processing' | 'success'>('buy');
  const [qty, setQty] = useState(1);
  const [wallet, setWallet] = useState<'phantom' | 'backpack' | null>('phantom');
  // Pasos de progreso para la animación de minteo
  const [progressStep, setProgressStep] = useState(0);

  // Mover el scroll hacia arriba al entrar a esta vista
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Cálculos de disponibilidad
  const available = event.total - event.sold;
  const pctSold = Math.round((event.sold / event.total) * 100);

  // Color dinámico de la barra de progreso según ocupación
  const progressBarColor = pctSold > 85
    ? 'bg-gradient-to-r from-[#E24B4A] to-[#ff6b6b]'
    : pctSold > 50
      ? 'bg-gradient-to-r from-[#FAC775] to-[#F0997B]'
      : 'bg-gradient-to-r from-[#1D9E75] to-[#5DCAA5]';

  // Función para manejar la cantidad de entradas
  const changeQty = (delta: number) => {
    setQty(prev => Math.max(1, Math.min(4, Math.min(available, prev + delta))));
  };

  // Iniciar la transición a la pantalla de procesamiento y animar
  const startPurchase = () => {
    setScreen('processing');
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgressStep(step);
      if (step >= 4) {
        clearInterval(interval);
        setTimeout(() => setScreen('success'), 600);
      }
    }, 900);
  };

  const EventIcon = (Icons as any)[event.icon] || Icons.HelpCircle;

  return (
    <div className="min-h-screen text-white font-sans selection:bg-[#534AB7] selection:text-white pb-10" style={{ background: 'linear-gradient(160deg, #080810 0%, #0a0a20 30%, #10082a 60%, #080810 100%)' }}>
      
      {/* Punto de luz ambiental detrás del bloque principal */}
      <div className="fixed top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#534AB7]/8 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* ======= NAVBAR SUPERIOR ======= */}
      <div className="fixed top-0 w-full z-50 bg-[#080810]/80 backdrop-blur-lg border-b border-[#1a1a2e]/60 px-5 h-[60px] flex items-center justify-between">
        <button onClick={onBack} className="w-[32px] h-[32px] rounded-full bg-[#1a1a2e] border border-[#2a2a4a] text-[#dddddd] flex items-center justify-center hover:bg-[#2a2a4a] hover:text-white transition-colors cursor-pointer">
          <Icons.ChevronLeft size={18} />
        </button>
        <div className="text-[13px] font-medium tracking-wide text-white/90">Asegura tu entrada</div>
        <div className="w-[32px]"></div>
      </div>

      {screen === 'buy' && (
        <div className="pt-[80px] px-4 md:px-5 w-full flex justify-center animate-in fade-in duration-500 pb-20 relative z-10">
          <div className="w-full max-w-[560px] flex flex-col gap-6">
            
            {/* ======= HERO DEL EVENTO ======= */}
            <div className="relative rounded-[32px] overflow-hidden shadow-2xl mt-2">
              <div className="absolute inset-0 opacity-30 saturate-150" style={{ background: event.bg }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#080810] via-[#080810]/70 to-[#080810]/40"></div>
              
              <div className="relative p-8 md:p-10 text-center flex flex-col items-center">
                <div className="bg-[#080810]/50 backdrop-blur-md p-4 rounded-3xl border border-[#2a2a4a] mb-5 shadow-inner">
                  <EventIcon size={56} color={event.color} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                </div>
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#534AB7] border border-[#6A5FE2] text-white text-[13px] font-black uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(83,74,183,0.5)]">
                  <Icons.Star size={14} /> {event.cat}
                </div>
                <h1 className="text-[32px] md:text-[42px] font-extrabold text-white leading-[1.15] drop-shadow-xl">{event.name}</h1>
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                  <div className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#12122a]/90 backdrop-blur-xl border border-[#2a2a4a] text-[14px] md:text-[15px] font-semibold text-white shadow-xl w-full sm:w-auto">
                    <Icons.CalendarDays size={18} className="text-[#534AB7]" /> {event.date}
                  </div>
                  <div className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#12122a]/90 backdrop-blur-xl border border-[#2a2a4a] text-[14px] md:text-[15px] font-semibold text-white shadow-xl w-full sm:w-auto">
                    <Icons.MapPin size={18} className="text-[#534AB7]" /> {event.venue}
                  </div>
                </div>
              </div>
            </div>

            {/* ======= ÁREA PRINCIPAL ======= */}
            {/* Barra de Disponibilidad */}
            <div className="w-[90%] self-center rounded-[24px] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 border border-[#1D9E75]/30" style={{ background: 'linear-gradient(135deg, #0a1a2e 0%, #0d2233 50%, #0a1a20 100%)' }}>
              {/* Glow sutil verde-azul en la esquina */}
              <div className="absolute -top-10 -right-10 w-[120px] h-[120px] bg-[#1D9E75]/15 rounded-full blur-[50px] pointer-events-none"></div>
              {pctSold > 85 && <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-[#E24B4A]/0 via-[#E24B4A] to-[#E24B4A]/0 animate-pulse"></div>}
              <div className="flex items-center justify-between gap-6">
                <div className="flex flex-col gap-1.5">
                  <div className="text-[12px] text-[#5DCAA5] font-extrabold uppercase tracking-[0.15em] leading-none">Disponibilidad</div>
                  {pctSold > 85 ? (
                    <div className="text-[12px] text-[#E24B4A] font-bold bg-[#E24B4A]/15 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 w-fit border border-[#E24B4A]/20"><Icons.Flame size={14} /> ¡Se agotan!</div>
                  ) : (
                    <div className="text-[12px] text-[#5DCAA5] font-bold bg-[#5DCAA5]/10 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 w-fit border border-[#5DCAA5]/20"><Icons.Zap size={14} /> Alta demanda</div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-[28px] font-black text-white leading-none drop-shadow-[0_0_10px_rgba(93,202,165,0.4)]">{available}</div>
                  <div className="text-[10px] text-[#5DCAA5]/70 mt-1 font-bold tracking-[0.2em] uppercase">Restantes</div>
                </div>
              </div>
              <div className="w-full mt-2">
                <div className="flex justify-between text-[10px] text-[#5DCAA5]/50 font-bold mb-2 uppercase tracking-widest">
                  <span>Ocupado al {pctSold}%</span>
                  <span>100% LLENO</span>
                </div>
                <div className="w-full h-[6px] bg-[#080810] rounded-full overflow-hidden border border-[#1a1a2e] shadow-inner">
                  <div className={`h-full rounded-full transition-all duration-1000 ${progressBarColor}`} style={{ width: `${pctSold}%` }}></div>
                </div>
              </div>
            </div>

            {/* ======= PANTALLA: COMPRAR ======= */}
            <div className="relative transform transition-transform duration-300 hover:-translate-y-1 group">
              {/* Resplandor morado-azul detrás del ticket */}
              <div className="absolute inset-0 rounded-[36px] -z-10 transition-all duration-500" style={{ background: 'radial-gradient(ellipse at center, rgba(83,74,183,0.25) 0%, rgba(30,60,200,0.1) 50%, transparent 80%)', filter: 'blur(30px)' }}></div>
              
              <div className="rounded-[36px] p-10 shadow-2xl relative z-0 overflow-hidden border border-[#3a3a8a]/50" style={{ background: 'linear-gradient(145deg, #12122a 0%, #151540 40%, #1a1a55 70%, #12122a 100%)' }}>
                
                {/* Iluminación suave en los bordes superiores */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[2px] bg-gradient-to-r from-transparent via-[#7F77DD]/60 to-transparent"></div>

                {/* Cortes laterales ticket */}
                <div className="absolute top-1/2 -left-6 w-12 h-12 rounded-full border-r border-[#3a3a8a]/50 -translate-y-1/2 z-10 shadow-inner" style={{ background: 'linear-gradient(160deg, #080810, #0a0a20)' }}></div>
                <div className="absolute top-1/2 -right-6 w-12 h-12 rounded-full border-l border-[#3a3a8a]/50 -translate-y-1/2 z-10 shadow-inner" style={{ background: 'linear-gradient(160deg, #080810, #0a0a20)' }}></div>
                
                {/* Línea punteada de corte */}
                <div className="absolute top-1/2 left-8 right-8 h-px border-t-[3px] border-dashed border-[#3a3a8a]/40 -translate-y-1/2 -z-10 opacity-70"></div>

                {/* Zona Precio */}
                <div className="text-center pb-8 border-b-0">
                  <div className="text-[12px] text-[#AFA9EC] font-bold tracking-[0.2em] uppercase mb-4">Valor del acceso</div>
                  <div className="text-[36px] md:text-[44px] font-extrabold leading-[1] tracking-tighter" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #d0c8ff 50%, #ffffff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(127,119,221,0.4))' }}>
                    {event.price === 0 ? 'Gratis' : `${event.price} SOL`}
                  </div>
                  {event.price > 0 && <div className="text-[16px] text-[#AFA9EC] mt-4 font-medium">≈ ${(event.price * 96).toFixed(2)} USD</div>}
                </div>

                {/* Zona Cantidad */}
                <div className="pt-10 flex flex-col items-center">
                  <div className="text-[12px] text-[#AFA9EC]/70 mb-5 font-bold uppercase tracking-[0.2em]">Selecciona cantidad</div>
                  <div className="flex items-center gap-8 bg-[#080810]/80 border border-[#3a3a8a]/40 rounded-2xl p-3 shadow-inner">
                    <button onClick={() => changeQty(-1)} className="w-[52px] h-[52px] rounded-xl flex items-center justify-center border border-transparent hover:border-[#534AB7]/50 text-[#888888] hover:bg-[#534AB7]/10 hover:text-[#AFA9EC] transition-all cursor-pointer"><Icons.Minus size={22} /></button>
                    <div className="text-[28px] font-bold text-white min-w-[40px] text-center tracking-tight">{qty}</div>
                    <button onClick={() => changeQty(1)} className="w-[52px] h-[52px] rounded-xl flex items-center justify-center border border-transparent hover:border-[#534AB7]/50 text-[#888888] hover:bg-[#534AB7]/10 hover:text-[#AFA9EC] transition-all cursor-pointer"><Icons.Plus size={22} /></button>
                  </div>
                  {event.price > 0 && (
                    <div className="mt-8 flex items-center justify-center bg-[#5DCAA5]/10 border border-[#5DCAA5]/30 rounded-xl px-5 py-3 text-[16px] font-bold text-[#5DCAA5] shadow-lg">
                      Subtotal: {(qty * event.price).toFixed(3)} SOL
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. BENEFICIOS PREMIUM (GRID) */}
            <div>
              <div className="text-[12px] font-bold text-[#888888] uppercase tracking-[0.2em] mb-6 text-center">Beneficios del ecosistema</div>
              <div className="grid grid-cols-2 gap-5">
                {/* QR Dinámico — Tonos azules */}
                <div className="rounded-[24px] p-7 flex flex-col items-center justify-center text-center hover:scale-[1.03] transition-all duration-300 shadow-lg group border border-[#3B82F6]/25 hover:border-[#3B82F6]/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]" style={{ background: 'linear-gradient(145deg, #0d1025 0%, #0f1535 100%)' }}>
                  <div className="w-16 h-16 rounded-full bg-[#3B82F6]/10 text-[#60A5FA] flex items-center justify-center mb-5 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-shadow border border-[#3B82F6]/20">
                    <Icons.QrCode size={28} />
                  </div>
                  <div className="text-[15px] font-bold text-white leading-snug">QR Dinámico<br/><span className="text-[#60A5FA] text-[13px] font-medium">Anti-fraude total</span></div>
                </div>
                
                {/* Intra-Wallet — Tonos verdes/turquesa */}
                <div className="rounded-[24px] p-7 flex flex-col items-center justify-center text-center hover:scale-[1.03] transition-all duration-300 shadow-lg group border border-[#1D9E75]/25 hover:border-[#1D9E75]/50 hover:shadow-[0_0_20px_rgba(29,158,117,0.1)]" style={{ background: 'linear-gradient(145deg, #0a1a18 0%, #0d2520 100%)' }}>
                  <div className="w-16 h-16 rounded-full bg-[#1D9E75]/10 text-[#5DCAA5] flex items-center justify-center mb-5 group-hover:shadow-[0_0_15px_rgba(29,158,117,0.3)] transition-shadow border border-[#1D9E75]/20">
                    <Icons.Wallet size={28} />
                  </div>
                  <div className="text-[15px] font-bold text-white leading-snug">Intra-Wallet<br/><span className="text-[#5DCAA5] text-[13px] font-medium">Pagos en barras</span></div>
                </div>

                {/* Acceso NFC — Tonos amarillos/naranjas */}
                <div className="rounded-[24px] p-7 flex flex-col items-center justify-center text-center hover:scale-[1.03] transition-all duration-300 shadow-lg group border border-[#FAC775]/25 hover:border-[#FAC775]/50 hover:shadow-[0_0_20px_rgba(250,199,117,0.1)]" style={{ background: 'linear-gradient(145deg, #1a1508 0%, #201a0d 100%)' }}>
                  <div className="w-16 h-16 rounded-full bg-[#FAC775]/10 text-[#FAC775] flex items-center justify-center mb-5 group-hover:shadow-[0_0_15px_rgba(250,199,117,0.3)] transition-shadow border border-[#FAC775]/20">
                    <Icons.Nfc size={28} />
                  </div>
                  <div className="text-[15px] font-bold text-white leading-snug">Acceso Pulsera<br/><span className="text-[#FAC775] text-[13px] font-medium">NFC rápido</span></div>
                </div>

                {/* POAP NFT — Tonos morados/rosados */}
                <div className="rounded-[24px] p-7 flex flex-col items-center justify-center text-center hover:scale-[1.03] transition-all duration-300 shadow-lg group border border-[#E879A8]/25 hover:border-[#E879A8]/50 hover:shadow-[0_0_20px_rgba(232,121,168,0.1)]" style={{ background: 'linear-gradient(145deg, #1a0d18 0%, #200d1e 100%)' }}>
                  <div className="w-16 h-16 rounded-full bg-[#E879A8]/10 text-[#E879A8] flex items-center justify-center mb-5 group-hover:shadow-[0_0_15px_rgba(232,121,168,0.3)] transition-shadow border border-[#E879A8]/20">
                    <Icons.BadgeCheck size={28} />
                  </div>
                  <div className="text-[15px] font-bold text-white leading-snug">POAP NFT<br/><span className="text-[#E879A8] text-[13px] font-medium">Coleccionable</span></div>
                </div>
              </div>
            </div>

            {/* 4. MÉTODO DE ACCESO (DECISIÓN) */}
            <div>
              <div className="text-[12px] font-bold text-[#888888] uppercase tracking-[0.2em] mb-6 text-center">Decide cómo recibir tu acceso</div>
              
              <div className="grid grid-cols-2 gap-5 mb-8">
                <div onClick={() => setWallet('phantom')} className={`cursor-pointer rounded-[28px] p-[2px] transition-all duration-300 ${wallet === 'phantom' ? 'bg-gradient-to-br from-[#534AB7] to-[#3C3489] shadow-[0_0_25px_rgba(83,74,183,0.4)]' : 'bg-[#1a1a2e] hover:bg-[#2a2a4a]'}`}>
                  <div className={`h-full rounded-[26px] p-7 flex flex-col items-center text-center relative ${wallet === 'phantom' ? 'border-transparent' : 'border border-[#2a2a4a]'}`} style={{ background: wallet === 'phantom' ? 'linear-gradient(145deg, #12102e 0%, #1a1545 100%)' : '#0d0d1e' }}>
                    <Icons.Ghost size={40} className={`mb-4 ${wallet === 'phantom' ? 'text-[#7F77DD] drop-shadow-[0_0_10px_rgba(127,119,221,0.5)]' : 'text-[#666]'}`} />
                    <div className={`text-[18px] font-bold mb-1 ${wallet === 'phantom' ? 'text-white' : 'text-[#888]'}`}>Phantom</div>
                    <div className={`text-[12px] font-medium ${wallet === 'phantom' ? 'text-[#AFA9EC]' : 'text-[#555]'}`}>Popular en Solana</div>
                    {wallet === 'phantom' && <div className="absolute top-5 right-5 w-7 h-7 bg-[#534AB7] rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(83,74,183,0.6)]"><Icons.Check size={16} color="white" strokeWidth={3} /></div>}
                  </div>
                </div>

                <div onClick={() => setWallet('backpack')} className={`cursor-pointer rounded-[28px] p-[2px] transition-all duration-300 ${wallet === 'backpack' ? 'bg-gradient-to-br from-[#1D9E75] to-[#0F6E56] shadow-[0_0_25px_rgba(29,158,117,0.4)]' : 'bg-[#1a1a2e] hover:bg-[#2a2a4a]'}`}>
                  <div className={`h-full rounded-[26px] p-7 flex flex-col items-center text-center relative ${wallet === 'backpack' ? 'border-transparent' : 'border border-[#2a2a4a]'}`} style={{ background: wallet === 'backpack' ? 'linear-gradient(145deg, #0a1e18 0%, #0d2e22 100%)' : '#0d0d1e' }}>
                    <Icons.Backpack size={40} className={`mb-4 ${wallet === 'backpack' ? 'text-[#5DCAA5] drop-shadow-[0_0_10px_rgba(93,202,165,0.5)]' : 'text-[#666]'}`} />
                    <div className={`text-[18px] font-bold mb-1 ${wallet === 'backpack' ? 'text-white' : 'text-[#888]'}`}>Backpack</div>
                    <div className={`text-[12px] font-medium ${wallet === 'backpack' ? 'text-[#9FE1CB]' : 'text-[#555]'}`}>Nativa xNFT</div>
                    {wallet === 'backpack' && <div className="absolute top-5 right-5 w-7 h-7 bg-[#1D9E75] rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(29,158,117,0.6)]"><Icons.Check size={16} color="white" strokeWidth={3} /></div>}
                  </div>
                </div>
              </div>

              <div className="relative mb-8 mx-10">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1a1a2e]"></div></div>
                <div className="relative flex justify-center"><span className="bg-[#0a0a20] px-5 text-[11px] font-black text-[#555] uppercase tracking-[0.25em]">Email Alternativo</span></div>
              </div>

              <div className="rounded-[24px] p-2.5 flex items-center focus-within:border-[#7F77DD] focus-within:shadow-[0_0_25px_rgba(83,74,183,0.2)] transition-all overflow-hidden group border border-[#2a2a4a]" style={{ background: 'linear-gradient(135deg, #0d0d1e 0%, #10102a 100%)' }}>
                <div className="w-[60px] h-[60px] flex items-center justify-center shrink-0 bg-[#080810] rounded-xl text-[#888] mr-4 border border-[#1a1a2e] group-focus-within:border-[#534AB7] group-focus-within:text-[#7F77DD] group-focus-within:shadow-[0_0_10px_rgba(83,74,183,0.2)] transition-all"><Icons.Mail size={24} /></div>
                <input type="email" placeholder="Recibir ticket por correo electrónico..." className="bg-transparent border-none outline-none text-[16px] font-medium text-white placeholder-[#555] w-full py-4 pr-5" />
              </div>
            </div>

            {/* 5. BOTÓN FINAL (ACCIÓN) */}
            <div className="mt-4 mb-2">
              <button 
                onClick={startPurchase} 
                disabled={available <= 0}
                className="w-full relative group overflow-hidden rounded-[28px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-shadow duration-300"
                style={{ boxShadow: '0 15px 50px rgba(83,74,183,0.3), 0 5px 20px rgba(232,121,168,0.15)' }}
              >
                {/* Degradado vibrante azul → morado → rosa */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #534AB7 35%, #7C3AED 65%, #E879A8 100%)' }}></div>
                
                {/* Brillo dinámico de izquierda a derecha */}
                <div className="absolute inset-y-0 -left-[100%] w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-1000 ease-in-out"></div>
                
                {/* Iluminación superior suave */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

                <div className="relative h-[80px] flex items-center justify-center gap-4 px-8">
                  <span className="text-[20px] md:text-[22px] font-extrabold text-white tracking-widest drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                    {available <= 0 ? 'AGOTADO' : event.price === 0 ? 'DESBLOQUEAR TICKET' : `PAGAR ${(qty * event.price).toFixed(3)} SOL`}
                  </span>
                  {available > 0 && <Icons.ArrowRight size={24} className="text-white/80 group-hover:translate-x-2 transition-transform duration-300" />}
                </div>
              </button>
              <div className="text-center mt-6 flex items-center justify-center gap-2.5 text-[12px] text-[#555] font-bold tracking-widest uppercase">
                <Icons.ShieldCheck size={16} className="text-[#5DCAA5]" /> Compra Segura · Solana Devnet
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* PANTALLA: PROCESAMIENTO */}
      {screen === 'processing' && (
        <div className="min-h-screen flex items-center justify-center px-5 flex-col absolute inset-0 z-50 animate-in fade-in duration-500" style={{ background: 'linear-gradient(160deg, #080810 0%, #0a0a20 30%, #10082a 60%, #080810 100%)' }}>
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

      {/* PANTALLA: ÉXITO */}
      {screen === 'success' && (
        <div className="min-h-screen flex items-center justify-center px-5 flex-col absolute inset-0 z-50 animate-in fade-in zoom-in-95 duration-500" style={{ background: 'linear-gradient(160deg, #080810 0%, #0a0a20 30%, #10082a 60%, #080810 100%)' }}>
          <div className="w-[88px] h-[88px] rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(29,158,117,0.2)]">
            <Icons.Check size={44} className="text-[#5DCAA5]" />
          </div>
          
          <h2 className="text-[28px] font-bold text-white mb-2 tracking-tight">Acceso Concedido</h2>
          <p className="text-[14px] text-[#AFA9EC] mb-10 font-medium tracking-wide">Revise su wallet para el activo digital</p>
          
          <div className="max-w-[340px] w-full bg-[#0d0d1e] border border-[#2a2a4a] rounded-[32px] overflow-hidden mb-8 relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform rotate-[-1deg] hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="h-[160px] flex items-center justify-center relative" style={{ background: event.bg }}>
               <EventIcon size={64} color={event.color} className="drop-shadow-2xl" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1e] via-transparent to-transparent"></div>
            </div>
            
            <div className="p-8 relative text-center">
              <div className="absolute -top-[28px] right-8 w-[56px] h-[56px] bg-[#080810] rounded-full flex items-center justify-center border border-[#1a1a2e] shadow-lg z-10">
                <Icons.QrCode size={24} className="text-[#5DCAA5]" />
              </div>
              
              <div className="inline-block px-3 py-1 bg-[#1a1a2e] rounded-md text-[10px] text-[#AFA9EC] font-mono tracking-widest uppercase mb-4 border border-[#2a2a4a]">
                MINT PASS · SOLANA
              </div>
              
              <h3 className="text-[22px] font-bold text-white mb-6 leading-tight">
                {event.name} <span className="text-[#555] ml-1">#{event.sold + 1}</span>
              </h3>
              
              <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-[#12122a] border border-[#1a1a2e] px-4 py-2 rounded-[12px] text-[12px] font-medium text-[#ddd]">{event.date}</span>
                <span className="bg-[#12122a] border border-[#1a1a2e] px-4 py-2 rounded-[12px] text-[12px] font-medium text-[#ddd]">{event.venue}</span>
              </div>
            </div>
            
            {/* Cortes laterales bottom ticket */}
            <div className="absolute bottom-[80px] -left-[16px] w-[32px] h-[32px] bg-[#080810] rounded-full border-r border-[#2a2a4a]"></div>
            <div className="absolute bottom-[80px] -right-[16px] w-[32px] h-[32px] bg-[#080810] rounded-full border-l border-[#2a2a4a]"></div>
            <div className="absolute bottom-[96px] left-8 right-8 h-px border-t-[2px] border-dashed border-[#2a2a4a] opacity-50"></div>
          </div>
          
          <div className="flex max-w-[340px] w-full gap-4">
            <button onClick={onGoToMyTicket} className="flex-[2] bg-[#5DCAA5] hover:bg-[#4eb392] text-[#085041] h-[56px] rounded-[20px] font-bold text-[15px] transition-all cursor-pointer shadow-[0_0_20px_rgba(29,158,117,0.3)]">
              Mostrar QR
            </button>
            <button className="flex-1 bg-[#1a1a2e] hover:bg-[#2a2a4a] text-white h-[56px] rounded-[20px] font-semibold text-[14px] transition-colors cursor-pointer border border-[#2a2a4a]">
              Wallet
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
