import * as Icons from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "../Home.css";

export interface OwnedTicket {
  eventId: number;
  mint: string;
  purchaseDate: number;
}

export default function TicketsList({ 
  tickets, 
  allEvents, 
  onBack, 
  onTicketClick 
}: { 
  tickets: OwnedTicket[], 
  allEvents: any[], 
  onBack: () => void, 
  onTicketClick: (mint: string) => void 
}) {
  const wallet = useWallet();

  return (
    <div className="app-home" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar Superior (Mismo estilo que Home) */}
      <div className="nav">
        <div className="nav-brand" onClick={onBack} style={{ cursor: 'pointer' }}>
          <div className="nav-logo" style={{ background: 'transparent' }}>
            <Icons.ChevronLeft size={24} color="#fff" />
          </div>
          <span className="nav-name" style={{ marginLeft: '-4px' }}>Volver</span>
        </div>
        <div className="nav-right">
          <WalletMultiButton className="btn-wallet" style={{ background: '#1a1a2e', fontFamily: 'inherit', height: 'auto', lineHeight: 1, padding: '8px 16px', fontSize: '13px' }} />
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="events-section" style={{ marginTop: '80px', flex: 1 }}>
        <div className="sec-hdr" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '32px' }}>
          <span className="sec-title" style={{ fontSize: '32px' }}>Mis tickets (NFTs)</span>
        </div>

        {!wallet.publicKey ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(83,74,183,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Icons.Wallet size={36} color="#7F77DD" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Conecta tu wallet</h2>
            <p style={{ color: '#888', fontSize: '15px', maxWidth: '320px' }}>Debes conectar tu wallet de Solana en la barra superior para acceder a tu bóveda de tickets NFT.</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Icons.Ticket size={36} color="#555" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Aún no tienes tickets</h2>
            <p style={{ color: '#888', fontSize: '15px', maxWidth: '320px' }}>Tu historial está vacío. Explora los eventos disponibles en el Home y adquiere tu primer Mintpass.</p>
            <button className="hbtn-main" style={{ marginTop: '28px', padding: '14px 32px' }} onClick={onBack}>Explorar eventos</button>
          </div>
        ) : (
          <div className="events-grid">
            {tickets.map(t => {
              const ev = allEvents.find(e => e.id === t.eventId);
              if (!ev) return null;
              
              const dateObj = new Date(t.purchaseDate);
              const dateStr = dateObj.toLocaleDateString() + ' a las ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

              const EventIcon = (Icons as any)[ev.icon || 'Music'] || Icons.HelpCircle;

              return (
                <div className="ecard" key={t.mint} onClick={() => onTicketClick(t.mint)}>
                  <div className="ecard-cover" style={{ background: ev.bg || 'rgba(83,74,183,0.15)' }}>
                    <span className="ecard-icon" style={{ display: 'flex' }}><EventIcon size={32} color={ev.color || '#fff'} /></span>
                    <div className="ecard-badge b-new" style={{ background: 'rgba(93,202,165,0.2)', color: '#5DCAA5' }}>Verificado</div>
                    <div className="nft-chip">NFT</div>
                  </div>
                  <div className="ecard-body">
                    <div className="ecard-cat">{ev.cat || ev.category}</div>
                    <div className="ecard-name">{ev.name}</div>
                    <div className="ecard-meta">{ev.date}<br />{ev.venue}</div>
                    
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '11px', color: '#777', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        <span style={{ color: '#5DCAA5', fontWeight: 'bold' }}>MINT:</span> {t.mint.substring(0,10)}...{t.mint.substring(t.mint.length-6)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#555' }}>Adquirido: {dateStr}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
