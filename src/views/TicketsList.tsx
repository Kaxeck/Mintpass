'use client';
import * as Icons from "lucide-react";
import WalletMultiButton from "../components/WalletButton";
import { useWalletSession } from "@solana/react-hooks";
import { usePrivy } from "@privy-io/react-auth";
import { LandingNavBar } from "../components/LandingNavBar";
import { LandingFooter } from "../components/LandingFooter";
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
  const session = useWalletSession();
  const { authenticated, user } = usePrivy();
  const walletConnected = authenticated || !!user?.wallet?.address || !!session?.account?.address;

  return (
    <div className="lp-container">
      <LandingNavBar />

      {/* Contenido Principal */}
      <div className="lp-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px', minHeight: 'calc(100vh - 200px)' }}>
        <div className="sec-hdr" style={{ borderBottom: '1px solid #EAEAEA', paddingBottom: '16px', marginBottom: '32px' }}>
          <span className="sec-title" style={{ fontSize: '32px', color: '#1E1E1E', fontWeight: 600, letterSpacing: '-0.02em' }}>Mis tickets (NFTs)</span>
        </div>

        {!walletConnected ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(83,74,183,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Icons.Wallet size={36} color="#534AB7" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E1E1E', marginBottom: '8px' }}>Conecta tu wallet</h2>
            <p style={{ color: '#666', fontSize: '15px', maxWidth: '320px', lineHeight: 1.5 }}>Debes conectar tu wallet de Solana en la barra superior para acceder a tu bóveda de tickets NFT.</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F7F8F7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Icons.Ticket size={36} color="#A1A1AA" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E1E1E', marginBottom: '8px' }}>Aún no tienes tickets</h2>
            <p style={{ color: '#666', fontSize: '15px', maxWidth: '320px', lineHeight: 1.5 }}>Tu historial está vacío. Explora los eventos disponibles en el Home y adquiere tu primer Mintpass.</p>
            <button className="hbtn-main" style={{ marginTop: '28px', padding: '12px 24px', background: '#14F195', color: '#1E1E1E', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }} onClick={onBack}>Explorar eventos</button>
          </div>
        ) : (
          <div className="lp-events-grid">
            {tickets.map(t => {
              const ev = allEvents.find(e => e.id === t.eventId);
              if (!ev) return null;
              
              const dateObj = new Date(t.purchaseDate);
              const dateStr = dateObj.toLocaleDateString() + ' a las ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

              const catImages: Record<string, string> = {
                'Música': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
                'Arte': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80',
                'Feria': 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=600&q=80',
                'Teatro': 'https://images.unsplash.com/photo-1507676184212-d0330a15233c?auto=format&fit=crop&w=600&q=80',
                'Deporte': 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=600&q=80',
                'Otro': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80'
              };
              
              const coverImage = catImages[ev.cat || ev.category] || catImages['Otro'];
              const uniqueImage = `${coverImage}&sig=${ev.id}`;

              return (
                <div key={t.mint} className="lp-event-card" onClick={() => onTicketClick(t.mint)}>
                  <div className="lp-event-cover" style={{ backgroundImage: `url("${uniqueImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <span className="lp-event-badge" style={{ background: '#1E1E1E', color: '#14F195' }}>MINT: {t.mint.substring(0,8)}...</span>
                  </div>
                  <div className="lp-event-body">
                    <div>
                      <p className="lp-event-name">{ev.name}</p>
                      <p className="lp-event-meta">{ev.date} · {ev.venue}</p>
                    </div>
                    <div className="lp-event-footer" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #EAEAEA', alignItems: 'flex-start', flexDirection: 'column', gap: '8px' }}>
                      <span className="lp-event-cat">{ev.cat || ev.category}</span>
                      <p className="lp-event-price" style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                        Adquirido: {dateStr}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <LandingFooter />
    </div>
  );
}

