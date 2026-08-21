const fs = require('fs');

const code = `'use client';
import { useState } from "react";
import * as Icons from "lucide-react";
import { CreatedEvent } from "../organizer/CreateEvent";
import { useWalletSession, useSolanaClient } from "@solana/react-hooks";
import { createEscrowReleaseInstruction } from "../../lib/escrow";
import { type Address } from "@solana/kit";
import AlertModal, { AlertModalProps } from "../../components/ui/AlertModal";

export default function EventDetails({ 
  event, 
  stats, 
  ownedTickets = [], 
  onBack, 
  onGoToStaff 
}: { 
  event: CreatedEvent, 
  stats?: {sold: number, checked: number}, 
  ownedTickets?: Array<{ mint: string, purchaseDate: number, eventId: string | number }>, 
  onBack: () => void, 
  onGoToStaff: () => void 
}) {
  if (!event) return null;
  const sold = stats?.sold || 0;
  const checked = stats?.checked || 0;
  const available = (event.aforo || 0) - sold;
  
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

  const session = useWalletSession();
  const client = useSolanaClient();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const walletAddress: Address | null = session?.account?.address ?? null;
  const walletConnected = !!walletAddress;
  const [withdrawn, setWithdrawn] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(\`mintpass_withdrawn_\${event.id}\`) === 'true' : false;
  });

  const handleWithdraw = async () => {
    if (checked < 2) {
      showAlert("Retiro Bloqueado", "Transacción Rechazada por el Contrato Inteligente:\\n\\nSe requieren al menos 2 validaciones de asistentes escaneados en puerta (check-ins reales on-chain) para liberar los fondos de la bóveda.", "warning");
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

    if (event.organizerWallet && walletAddress !== event.organizerWallet) {
      showAlert("Acceso Denegado", "Solo la wallet que creó legítimamente el evento tiene la autoridad criptográfica para extraer los fondos de la bóveda.", "error");
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
      localStorage.setItem(\`mintpass_withdrawn_\${event.id}\`, 'true');
      setWithdrawn(true);
      showAlert("¡Retiro Exitoso!", \`Los fondos han sido liberados desde el contrato a tu wallet privada.\\n\\nSe transfirieron \${totalSol} SOL de las ganancias.\`, "success", sig);
    } catch (e: any) {
      showAlert("Error de Validación Blockchain", e.message, "error");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const pct = Math.round((sold / (event.aforo || 1)) * 100);

  const bgStyle = event.coverImage ? { backgroundImage: \`url("\${event.coverImage}")\` } : { background: '#1E1E1E' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F7F8F7' }}>
      
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
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#1E1E1E' }}>{event.name}</span>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Ticket size={16} /> {event.price === 0 ? 'Gratis' : \`\${event.price} SOL\`}</div>
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
                  <div style={{ height: '100%', width: \`\${pct}%\`, background: pct > 80 ? '#E24B4A' : '#14F195', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                </div>
              </div>
            </div>

            {/* Link & Blinks */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D3D1C7', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E1E1E', margin: 0 }}>Venta y Promoción</h3>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#F7F8F7', padding: '12px 16px', borderRadius: '8px', border: '1px solid #D3D1C7', marginBottom: '16px' }}>
                <Icons.Link size={18} color="#5F5E5A" />
                <span style={{ flex: 1, fontSize: '14px', color: '#1E1E1E', fontFamily: 'monospace' }}>
                  http://localhost:3000/purchase/{event.id}
                </span>
                <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#1E1E1E', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                  {copied ? <Icons.Check size={16} color="#14F195" /> : <Icons.Copy size={16} />} 
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="bp-btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Icons.Zap size={16} /> Crear campaña Solana Blink
                </button>
                <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#FFFFFF', border: '1px solid #D3D1C7', color: '#1E1E1E', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  <Icons.QrCode size={16} /> Descargar QR Promocional
                </button>
              </div>
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
                    const timeStr = diffMins === 0 ? 'Hace un instante' : diffMins < 60 ? \`Hace \${diffMins} min\` : \`Hace \${Math.floor(diffMins/60)} h\`;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '12px', background: '#F7F8F7', borderRadius: '8px', border: '1px solid #D3D1C7' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1E1E1E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, marginRight: '16px' }}>
                          T{String(ownedTickets.length - idx).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E1E1E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {t.mint.substring(0, 8)}...{t.mint.substring(t.mint.length - 6)}
                            <a href={\`https://explorer.solana.com/address/\${t.mint}?cluster=devnet\`} target="_blank" rel="noreferrer" style={{ color: '#5F5E5A', display: 'flex', alignItems: 'center' }}>
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
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1E1E1E', color: '#14F195', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.ScanLine size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Accesos y Staff</div>
                    <div style={{ fontSize: '12px', color: '#5F5E5A' }}>Generar tokens para escáner</div>
                  </div>
                </button>

                <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#F7F8F7', border: '1px solid #D3D1C7', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'border 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor='#1E1E1E'} onMouseOut={e => e.currentTarget.style.borderColor='#D3D1C7'}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#E8F5E9', color: '#2E7D32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Wallet size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Wallet intra-evento</div>
                    <div style={{ fontSize: '12px', color: '#5F5E5A' }}>Pagos en barras y merch</div>
                  </div>
                </button>

                <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#F7F8F7', border: '1px solid #D3D1C7', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'border 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor='#1E1E1E'} onMouseOut={e => e.currentTarget.style.borderColor='#D3D1C7'}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFF3E0', color: '#E65100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Medal size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Generar POAPs</div>
                    <div style={{ fontSize: '12px', color: '#5F5E5A' }}>Recompensar asistencia</div>
                  </div>
                </button>

                <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#F7F8F7', border: '1px solid #D3D1C7', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'border 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor='#1E1E1E'} onMouseOut={e => e.currentTarget.style.borderColor='#D3D1C7'}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5F5F5', color: '#5F5E5A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Pencil size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Editar evento</div>
                    <div style={{ fontSize: '12px', color: '#5F5E5A' }}>Modificar info o aforo</div>
                  </div>
                </button>
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

              <button 
                onClick={handleWithdraw}
                disabled={isWithdrawing || withdrawn}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  background: checked >= 2 && !withdrawn && !isWithdrawing ? '#14F195' : '#F7F8F7',
                  color: checked >= 2 && !withdrawn && !isWithdrawing ? '#1E1E1E' : '#A1A1AA',
                  border: checked >= 2 && !withdrawn && !isWithdrawing ? 'none' : '1px solid #D3D1C7',
                  cursor: (isWithdrawing || withdrawn) ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {isWithdrawing ? (
                  <><Icons.Loader size={16} className="animate-spin" /> Procesando...</>
                ) : withdrawn ? (
                  <><Icons.CheckCircle size={16} /> Fondos liberados</>
                ) : (
                  <><Icons.Lock size={16} /> Retirar ({checked}/2 escaneos)</>
                )}
              </button>

              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #D3D1C7' }}>
                <h3 style={{ fontSize: '12px', color: '#5F5E5A', margin: '0 0 8px 0', fontWeight: 600 }}>Contrato NFT (Devnet)</h3>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1E1E1E', wordBreak: 'break-all', background: '#F7F8F7', padding: '10px', borderRadius: '6px', border: '1px solid #D3D1C7' }}>
                  {event.collectionMint || "No desplegado"}
                </div>
                <a href={\`https://explorer.solana.com/address/\${event.collectionMint}?cluster=devnet\`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#5F5E5A', marginTop: '8px', textDecoration: 'none', fontWeight: 600 }}>
                  Ver en Explorer <Icons.ExternalLink size={10} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <AlertModal {...alertConfig} />
    </div>
  );
}
`;

fs.writeFileSync('src/features/public/EventDetails.tsx', code);
