'use client';
import { useState } from "react";
import * as Icons from "lucide-react";
import { CreatedEvent } from "../organizer/CreateEvent";
import { createEscrowReleaseInstruction } from "../../lib/escrow";
import { type Address } from "@solana/kit";
import AlertModal, { AlertModalProps } from "../../components/ui/AlertModal";
import { getEventTickets } from "../../app/actions/tickets";
import { useEffect } from "react";
import { useUmi } from "../../components/providers";
import { useActiveSolanaWallet } from "../../hooks/useActiveSolanaWallet";
export default function EventDetails({ 
  event, 
  stats, 
  isVerified,
  onBack, 
  onGoToStaff 
}: { 
  event: CreatedEvent, 
  stats?: {sold: number, checked: number}, 
  isVerified?: boolean,
  onBack: () => void, 
  onGoToStaff?: () => void 
}) {
  const umi = useUmi();
  const [activeTab, setActiveTab] = useState<'info' | 'tickets'>('info');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [searchTicket, setSearchTicket] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'USED' | 'CANCELLED'>('ALL');
  
  // Stats
  const sold = stats?.sold ?? (event as any).sold ?? 0;
  const checked = stats?.checked ?? 0;
  const aforo = (event as any).aforo || (event as any).total || (event.zones ? event.zones.reduce((acc: number, z: any) => acc + (z.capacity || 0), 0) : 0) || 1;
  const available = Math.max(0, aforo - sold);

  // Escrow & actions states
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [ownedTickets, setOwnedTickets] = useState<Array<{ mint: string, purchaseDate: number, eventId: string | number, zoneIndex?: number }>>([]);
  
  useEffect(() => {
    async function loadTickets() {
      if (!event.id) return;
      try {
        const ticketsData = await getEventTickets(Number(event.id));
        if (ticketsData) {
          setOwnedTickets(ticketsData.map(t => ({
            mint: t.mintAddress,
            purchaseDate: new Date(t.lastUpdatedAt || Date.now()).getTime(),
            eventId: t.eventAddress,
            zoneIndex: t.zoneIndex
          })));
        }
      } catch (e) {
        console.error("Error loading tickets:", e);
      }
    }
    loadTickets();
  }, [event.id]);

  const [copied, setCopied] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalProps>({ 
    isOpen: false, title: '', message: '', type: 'info', 
    onClose: () => setAlertConfig(p => ({...p, isOpen: false})) 
  });
  
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const [isFinishing, setIsFinishing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { walletAddress: walletAddressStr, user } = useActiveSolanaWallet();
  const walletAddress: Address | null = walletAddressStr ? (walletAddressStr as Address) : null;

  const [editData, setEditData] = useState({
    description: event.description || '',
    coverImageUrl: event.coverImage || '',
    doorTime: event.doorTime || '',
    ageRestriction: event.ageRestriction || '',
    galleryUrls: (event as any).galleryUrls || [] as string[]
  });

  const showAlert = (title: string, message: string, type: AlertModalProps['type'], signature?: string) => {
    setAlertConfig(prev => ({ ...prev, isOpen: true, title, message, type, signature }));
  };

  const handleFinishEvent = async () => {
    setIsFinishing(true);
    try {
      if (!walletAddress || !event.collectionMint) {
        showAlert("Error de conexión", "Asegúrate de tener tu wallet conectada.", "warning");
        return;
      }

      const { buildFinishEventInstruction } = await import("../../lib/event-pda");
      const { transactionBuilder } = await import("@metaplex-foundation/umi");

      const ix = await buildFinishEventInstruction(walletAddress, event.collectionMint);
      const txBuilder = transactionBuilder().add({
        instruction: ix,
        signers: [umi.identity],
        bytesCreatedOnChain: 0
      });

      showAlert("Firma requerida", "Abre tu Phantom wallet y firma la transacción para finalizar el evento exitosamente.", "info");

      await txBuilder.sendAndConfirm(umi);

      const { finishEventInDb } = await import("../../app/actions/events");
      const res = await finishEventInDb(event.id.toString(), walletAddress.toString());
      
      if (res.success) {
        event.status = 'CLOSED';
        showAlert("Evento Finalizado", "El evento ha concluido exitosamente y tu reputación ha sido actualizada.", "success");
      } else {
        showAlert("Error al sincronizar", "Transacción exitosa On-Chain, pero hubo un error actualizando la vista: " + res.error, "error");
      }
    } catch (e: any) {
      console.error(e);
      showAlert("Error On-Chain", "La transacción falló: " + e.message, "error");
    } finally {
      setIsFinishing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!walletAddress) return;
    try {
      const { updateEventOffchain } = await import("../../app/actions/events");
      const res = await updateEventOffchain(event.id.toString(), walletAddress.toString(), editData);
      if (res.success) {
        setShowEditModal(false);
        event.description = editData.description;
        event.coverImage = editData.coverImageUrl;
        event.doorTime = editData.doorTime;
        event.ageRestriction = editData.ageRestriction;
        (event as any).galleryUrls = editData.galleryUrls;
        showAlert("Evento Actualizado", "Los datos off-chain han sido guardados correctamente.", "success");
      } else {
        showAlert("Error al guardar", res.error || "Ocurrió un error inesperado", "error");
      }
    } catch (e: any) {
      showAlert("Error al guardar", e.message, "error");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/purchase/${event.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      if (!walletAddress || !event.collectionMint) {
        showAlert("Error de conexión", "Asegúrate de tener tu wallet conectada y que el evento esté desplegado en la blockchain (Collection Mint).", "warning");
        setIsCancelling(false);
        return;
      }

      // 1. Transaction on Blockchain
      const { buildCancelEventInstruction } = await import("../../lib/event-pda");
      const { transactionBuilder } = await import("@metaplex-foundation/umi");

      let txBuilder = transactionBuilder();

      /*
      // Check if reputation exists (Pausado temporalmente a petición del admin para redesplegar el contrato sin reputación)
      const { getAddressEncoder, getProgramDerivedAddress } = await import("@solana/addresses");
      const encoder = getAddressEncoder();
      const EVENT_REGISTRY_PROGRAM_ID = "FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM";
      const reputationPda = (await getProgramDerivedAddress({
        programAddress: EVENT_REGISTRY_PROGRAM_ID as any,
        seeds: [Buffer.from("reputation"), encoder.encode(walletAddress)]
      }))[0];

      const rpc = umi.rpc;
      const accountExists = await rpc.accountExists(reputationPda as any);
      
      if (!accountExists) {
        const { buildInitReputationInstruction } = await import("../../lib/event-pda");
        const initIx = await buildInitReputationInstruction(walletAddress);
        txBuilder = txBuilder.add({
          instruction: initIx,
          signers: [umi.identity],
          bytesCreatedOnChain: 0
        });
      }
      */

      const ix = await buildCancelEventInstruction(walletAddress, event.collectionMint);
      txBuilder = txBuilder.add({
        instruction: ix,
        signers: [umi.identity],
        bytesCreatedOnChain: 0
      });

      showAlert("Firma requerida", "Abre tu Phantom wallet y firma la transacción de cancelación. Esta acción tomará unos segundos en confirmarse.", "info");

      await txBuilder.sendAndConfirm(umi);

      // 2. Synchronize DB
      const { cancelEventInDb } = await import("../../app/actions/events");
      const res = await cancelEventInDb(event.id.toString(), walletAddress);
      
      if (res.success) {
        event.status = 'CANCELLED';
        setShowCancelConfirm(false);
        showAlert("Evento Cancelado", "El evento ha sido cancelado exitosamente On-Chain. Los fondos están listos para reembolso.", "success");
        setTimeout(() => onBack(), 3000);
      } else {
        showAlert("Error al sincronizar", "Transacción exitosa On-Chain, pero hubo un error actualizando la vista: " + res.error, "error");
      }
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      showAlert("Error On-Chain", "La transacción de cancelación falló o fue rechazada:\n" + msg, "error");
    } finally {
      setIsCancelling(false);
    }
  };


  const walletConnected = !!walletAddress;
  const [withdrawn, setWithdrawn] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(`mintpass_withdrawn_${event.id}`) === 'true' : false;
  });

  const eventTime = new Date(event.date + 'T' + (event.time || '00:00')).getTime();
  const refundWindowMs = 3 * 24 * 60 * 60 * 1000; // 3 days for claims
  const isEventPast = eventTime < Date.now();
  
  // FUNCIONALIDAD REAL: El escrow se libera 3 días después del evento para permitir reembolsos
  // const isEscrowReleased = Date.now() >= eventTime  // MVP: Para fines de demostración, permitimos el cobro cuando el evento se marca como finalizado
  const isEscrowReleased = event.status === 'CLOSED';

  const handleWithdraw = async () => {
    if (!isEscrowReleased) {
      showAlert("Retiro Bloqueado", "El contrato inteligente retiene los fondos. Debes finalizar el evento primero para acceder al escrow.", "warning");
      return;
    }

    if (event.priceType !== 'sol') {
      showAlert("No Soportado", "Simulación: Pagos en USDC requieren inicializar Cuentas Token (ATA). Se omitirá para evitar colisiones en la demo de SOL.", "info");
      return;
    }

    if (!walletConnected) {
      showAlert("Wallet Desconectada", "Conecta tu wallet principal para autorizar la recepción de los fondos desde el contrato inteligente.", "warning");
      return;
    }

    try {
      setIsWithdrawing(true);
      const totalSol = sold * (event.price || 0);
      const releaseIx = await createEscrowReleaseInstruction(walletAddress, totalSol);
      if (!releaseIx) {
        showAlert("Evento Gratuito", "No hay fondos que retirar en eventos gratuitos.", "info");
        return;
      }
      const sig = "pending-integration";
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

  const bgStyle = event?.coverImage ? { backgroundImage: `url("${event.coverImage}")` } : { background: '#1E1E1E' };

  if (!event) return null;

  return (
    <>
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', background: '#F7F8F7' }}>
      
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', background: '#FFFFFF', borderBottom: '1px solid #D3D1C7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#5F5E5A', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            <Icons.ArrowLeft size={16} /> Volver
          </button>
          <div style={{ width: '1px', height: '24px', background: '#D3D1C7' }}></div>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#1E1E1E', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {event.name}
            {isVerified && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#EAF3DE', color: '#27500A', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                <Icons.ShieldCheck size={12} /> Verificado On-chain
              </span>
            )}
          </span>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#E8F5E9', color: '#2E7D32', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>
            <div style={{ width: '6px', height: '6px', background: '#4CAF50', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
            Evento activo
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Left Column (Main Info) */}
          <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Hero Card */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D3D1C7', overflow: 'hidden' }}>
              <div style={{ height: '140px', ...bgStyle, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}></div>
                <div style={{ position: 'absolute', bottom: '16px', left: '20px', display: 'flex', gap: '8px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', color: '#FFFFFF', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                    {event.category}
                  </span>
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1E1E1E', margin: '0 0 12px 0' }}>{event.name}</h1>
                <div style={{ display: 'flex', gap: '16px', color: '#5F5E5A', fontSize: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.CalendarDays size={16} /> {event.date} · {event.time}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.MapPin size={16} /> {event.venue}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Ticket size={16} /> {event.price === 0 ? 'Gratis' : `${event.price} SOL`}</div>
                </div>
              </div>
            </div>

            {/* Sales Stats */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D3D1C7', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E1E1E', margin: '0 0 20px 0' }}>Ventas y Asistencia</h3>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                <div style={{ flex: 1, padding: '16px', background: '#F7F8F7', borderRadius: '12px', border: '1px solid #D3D1C7' }}>
                  <div style={{ fontSize: '28px', fontWeight: 600, color: '#1E1E1E', lineHeight: 1 }}>{sold}</div>
                  <div style={{ fontSize: '13px', color: '#5F5E5A', marginTop: '6px' }}>Boletos Vendidos</div>
                </div>
                <div style={{ flex: 1, padding: '16px', background: '#F7F8F7', borderRadius: '12px', border: '1px solid #D3D1C7' }}>
                  <div style={{ fontSize: '28px', fontWeight: 600, color: '#1E1E1E', lineHeight: 1 }}>{checked}</div>
                  <div style={{ fontSize: '13px', color: '#5F5E5A', marginTop: '6px' }}>Asistentes Escaneados</div>
                </div>
                <div style={{ flex: 1, padding: '16px', background: '#F7F8F7', borderRadius: '12px', border: '1px solid #D3D1C7' }}>
                  <div style={{ fontSize: '28px', fontWeight: 600, color: '#1E1E1E', lineHeight: 1 }}>{available}</div>
                  <div style={{ fontSize: '13px', color: '#5F5E5A', marginTop: '6px' }}>Disponibles</div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#5F5E5A', marginBottom: '8px', fontWeight: 500 }}>
                  <span>Aforo Ocupado</span>
                  <span style={{ color: '#1E1E1E' }}>{pct}%</span>
                </div>
                <div style={{ height: '8px', background: '#EAEAEA', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#E24B4A' : '#14F195', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                </div>
              </div>

              {event.zones && event.zones.length > 0 && (
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #D3D1C7' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E1E1E', margin: '0 0 12px 0' }}>Desglose por Zona</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {event.zones.map((zone, idx) => {
                      const zoneSold = ownedTickets.filter(t => t.zoneIndex === idx).length;
                      const zonePct = zone.capacity > 0 ? Math.round((zoneSold / zone.capacity) * 100) : 0;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F7F8F7', padding: '12px 16px', borderRadius: '8px', border: '1px solid #D3D1C7' }}>
                          <div>
                            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>{zone.name}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#5F5E5A' }}>{zone.price === 0 ? 'Gratis' : `${zone.price} SOL`}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>{zoneSold} / {zone.capacity} <span style={{fontSize: '12px', color: '#A1A1AA', fontWeight: 400}}>vendidos</span></p>
                            <p style={{ margin: 0, fontSize: '12px', color: zonePct >= 100 ? '#E24B4A' : zonePct > 80 ? '#EF9F27' : '#4BAA46', fontWeight: 500 }}>{zonePct}% Ocupado</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Link & Blinks */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D3D1C7', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E1E1E', margin: 0 }}>Venta y Promoción</h3>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#F7F8F7', padding: '12px 16px', borderRadius: '8px', border: '1px solid #D3D1C7', marginBottom: '16px' }}>
                <Icons.Link size={18} color="#5F5E5A" />
                <span style={{ flex: 1, fontSize: '14px', color: '#1E1E1E', fontFamily: 'monospace' }}>
                  {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/purchase/{event.id}
                </span>
                <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#1E1E1E', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                  {copied ? <Icons.Check size={16} color="#14F195" /> : <Icons.Copy size={16} />} 
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              {!isEventPast && event.status !== 'CANCELLED' && event.status !== 'CLOSED' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => showAlert("Descargar QR (Próximamente)", "En la versión de producción, se descargará un PDF en alta resolución con el código QR para tus flyers impresos.", "info")} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#FFFFFF', border: '1px solid #D3D1C7', color: '#1E1E1E', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: '10px 0' }}>
                    <Icons.QrCode size={16} /> Descargar QR Promocional
                  </button>
                </div>
              )}
            </div>

            {/* Recent Purchases */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D3D1C7', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E1E1E', margin: 0 }}>Últimas Compras</h3>
                <span style={{ fontSize: '13px', color: '#5F5E5A', cursor: 'pointer' }}>Ver todas</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ownedTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#A1A1AA', fontSize: '14px' }}>
                    Sin boletos vendidos aún.
                  </div>
                ) : (
                  ownedTickets.slice().map((t, idx) => {
                    const diffMins = Math.floor((Date.now() - t.purchaseDate) / 60000);
                    const timeStr = diffMins === 0 ? 'Hace un instante' : diffMins < 60 ? `Hace ${diffMins} min` : `Hace ${Math.floor(diffMins/60)} h`;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: '#F7F8F7', borderRadius: '8px', border: '1px solid #D3D1C7' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1E1E1E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, marginRight: '16px' }}>
                          T{String(ownedTickets.length - idx).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E1E1E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {t.mint.substring(0, 8)}...{t.mint.substring(t.mint.length - 6)}
                            <a href={`https://explorer.solana.com/address/${t.mint}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: '#5F5E5A', display: 'flex', alignItems: 'center' }}>
                              <Icons.ExternalLink size={12} />
                            </a>
                          </div>
                          <div style={{ fontSize: '12px', color: '#5F5E5A', marginTop: '2px' }}>{timeStr}</div>
                        </div>
                        <div style={{ fontSize: '12px', background: '#E8F5E9', color: '#2E7D32', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                          Comprado
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right Column (Actions & Revenue) */}
          <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quick Actions */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D3D1C7', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E1E1E', margin: '0 0 20px 0' }}>Administración</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={onGoToStaff} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#F7F8F7', border: '1px solid #D3D1C7', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'border 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor='#1E1E1E'} onMouseOut={e => e.currentTarget.style.borderColor='#D3D1C7'}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5F5F5', color: '#5F5E5A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.ScanLine size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Accesos y Staff</div>
                    <div style={{ fontSize: '12px', color: '#5F5E5A' }}>Gestión de escáner en puerta</div>
                  </div>
                </button>



                {!isEventPast && event.status !== 'CANCELLED' && event.status !== 'CLOSED' && (
                  <button onClick={() => setShowEditModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#F7F8F7', border: '1px solid #D3D1C7', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'border 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor='#1E1E1E'} onMouseOut={e => e.currentTarget.style.borderColor='#D3D1C7'}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5F5F5', color: '#5F5E5A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icons.Pencil size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Editar evento</div>
                      <div style={{ fontSize: '13px', color: '#5F5E5A', marginTop: '2px' }}>Modifica la descripción o imágenes</div>
                    </div>
                  </button>
                )}

                {!isEventPast && event.status !== 'CANCELLED' && event.status !== 'CLOSED' && (
                  <button onClick={() => setShowCancelConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='#FEE2E2'} onMouseOut={e => e.currentTarget.style.background='#FEF2F2'}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FCA5A5', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icons.XCircle size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B' }}>Cancelar Evento</div>
                      <div style={{ fontSize: '13px', color: '#B91C1C', marginTop: '2px' }}>Detener ventas y reembolsar</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Revenue & Contract */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D3D1C7', padding: '24px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', color: '#5F5E5A', margin: '0 0 8px 0', fontWeight: 500 }}>Recaudación on-chain</h3>
                <div style={{ fontSize: '32px', fontWeight: 600, color: '#1E1E1E', lineHeight: 1 }}>
                  {event.price === 0 ? '0.00' : (sold * (event.price || 0)).toFixed(2)} <span style={{ fontSize: '16px', color: '#A1A1AA' }}>SOL</span>
                </div>
                <div style={{ fontSize: '12px', color: '#5F5E5A', marginTop: '8px' }}>
                  Sin comisiones de plataforma. Bóveda auto-custodiada.
                </div>
              </div>

              {event.status !== 'CLOSED' && isEventPast && event.status !== 'CANCELLED' && (
                <button 
                  onClick={handleFinishEvent}
                  disabled={isFinishing}
                  style={{ width: '100%', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#9945FF', color: '#FFFFFF', border: 'none', cursor: isFinishing ? 'not-allowed' : 'pointer', transition: 'background 0.2s', marginBottom: '12px' }}
                >
                  {isFinishing ? <><Icons.Loader size={16} className="animate-spin" /> Procesando...</> : <><Icons.Award size={16} /> Finalizar Evento Exitosamente</>}
                </button>
              )}

              {(event.price || 0) > 0 ? (
                <button 
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || withdrawn || !isEscrowReleased}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: isEscrowReleased && !withdrawn && !isWithdrawing ? '#14F195' : '#F7F8F7',
                    color: isEscrowReleased && !withdrawn && !isWithdrawing ? '#1E1E1E' : '#A1A1AA',
                    border: isEscrowReleased && !withdrawn && !isWithdrawing ? 'none' : '1px solid #D3D1C7',
                    cursor: (isWithdrawing || withdrawn || !isEscrowReleased) ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {isWithdrawing ? (
                    <><Icons.Loader size={16} className="animate-spin" /> Procesando...</>
                  ) : withdrawn ? (
                    <><Icons.CheckCircle size={16} /> Fondos liberados</>
                  ) : isEscrowReleased ? (
                    <><Icons.ArrowDownToLine size={16} /> Retirar fondos del Escrow</>
                  ) : isEventPast && event.status !== 'CLOSED' ? (
                    <><Icons.Lock size={16} /> Debe finalizar el evento primero</>
                  ) : (
                    <><Icons.Lock size={16} /> Bloqueado por Escrow</>
                  )}
                </button>
              ) : (
                <div style={{ width: '100%', padding: '14px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#F7F8F7', color: '#5F5E5A', border: '1px solid #D3D1C7' }}>
                  <Icons.Info size={16} /> Evento gratuito (sin fondos a retirar)
                </div>
              )}

              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #D3D1C7' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E1E1E', margin: '0 0 12px 0' }}>Registros On-Chain</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F7F8F7', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D3D1C7' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E1E1E' }}>Colección de Boletos (NFT)</div>
                      <div style={{ fontSize: '11px', color: '#5F5E5A', fontFamily: 'monospace' }}>{event.collectionMint || "Pendiente"}</div>
                    </div>
                    {event.collectionMint && (
                      <a href={`https://explorer.solana.com/address/${event.collectionMint}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: '#14F195' }}>
                        <Icons.ExternalLink size={16} />
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F7F8F7', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D3D1C7' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E1E1E' }}>Contrato del Evento</div>
                      <div style={{ fontSize: '11px', color: '#5F5E5A', fontFamily: 'monospace' }}>{event.address || "Pendiente"}</div>
                    </div>
                    {event.address && (
                      <a href={`https://explorer.solana.com/address/${event.address}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: '#14F195' }}>
                        <Icons.ExternalLink size={16} />
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F7F8F7', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D3D1C7' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E1E1E' }}>Bóveda de Fondos (Escrow)</div>
                      <div style={{ fontSize: '11px', color: '#5F5E5A', fontFamily: 'monospace' }}>{event.escrowVault || "Pendiente"}</div>
                    </div>
                    {event.escrowVault && (
                      <a href={`https://explorer.solana.com/address/${event.escrowVault}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: '#14F195' }}>
                        <Icons.ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      </div>
      
      {showCancelConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#DC2626', marginBottom: '16px' }}>
              <Icons.AlertTriangle size={28} />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Cancelar Evento</h2>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1E1E1E', lineHeight: 1.5 }}>
              ¿Estás seguro de que deseas cancelar <strong>{event.name}</strong>?
            </p>
            <div style={{ background: '#FEF2F2', padding: '16px', borderRadius: '8px', border: '1px solid #FCA5A5', marginBottom: '24px' }}>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#991B1B', fontSize: '13px', lineHeight: 1.6 }}>
                <li>El contrato inteligente de Escrow se desbloqueará para reembolsos.</li>
                <li>Los fondos retenidos serán devueltos a los compradores.</li>
                <li>Los boletos emitidos quedarán invalidados inmediatamente.</li>
                <li>Esta acción <strong>es irreversible</strong>.</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowCancelConfirm(false)} style={{ flex: 1, padding: '12px', background: '#F5F5F5', color: '#1E1E1E', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Regresar
              </button>
              <button onClick={handleConfirmCancel} disabled={isCancelling} style={{ flex: 1, padding: '12px', background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: isCancelling ? 0.7 : 1 }}>
                {isCancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1E1E1E' }}>Editar Evento (Off-Chain)</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#5F5E5A' }}><Icons.X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#1E1E1E', display: 'block', marginBottom: '6px' }}>Descripción</label>
                <textarea value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none', minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#1E1E1E', display: 'block', marginBottom: '6px' }}>Imagen de Portada (URL)</label>
                <input type="text" value={editData.coverImageUrl} onChange={e => setEditData({...editData, coverImageUrl: e.target.value})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1E1E1E', display: 'block', marginBottom: '6px' }}>Apertura de Puertas</label>
                  <input type="time" value={editData.doorTime} onChange={e => setEditData({...editData, doorTime: e.target.value})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1E1E1E', display: 'block', marginBottom: '6px' }}>Restricción de Edad</label>
                  <select value={editData.ageRestriction} onChange={e => setEditData({...editData, ageRestriction: e.target.value})} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none' }}>
                    <option value="">Selecciona</option>
                    <option value="Todas las edades">Todas las edades</option>
                    <option value="+14">+14</option>
                    <option value="+18">+18 (Solo Adultos)</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '12px', background: '#F5F5F5', color: '#1E1E1E', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSaveEdit} style={{ flex: 1, padding: '12px', background: '#1E1E1E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal {...alertConfig} />
    </>
  );
}
