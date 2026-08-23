'use client';
import { useState } from 'react';
import * as Icons from "lucide-react";
import WalletMultiButton from "../../components/ui/WalletButton";
import { LandingNavBar } from "../../components/layout/LandingNavBar";
import { LandingFooter } from "../../components/layout/LandingFooter";
import { useActiveSolanaWallet } from "../../hooks/useActiveSolanaWallet";
import "../../styles/buyer.css";
import "./TicketsList.css";

export interface OwnedTicket {
  eventId: number;
  mint: string;
  purchaseDate: number;
}

export default function TicketsList({ 
  tickets, 
  events, 
  loading,
  onBack, 
  onTicketClick 
}: { 
  tickets: any[], 
  events: any,
  loading: boolean,
  onBack: () => void, 
  onTicketClick: (mint: string) => void 
}) {
  const { authenticated, walletAddress } = useActiveSolanaWallet();
  const walletConnected = authenticated || !!walletAddress;
  const [activeTab, setActiveTab] = useState<'proximos' | 'pasados'>('proximos');

  return (
    <div className="lp-container">
      <LandingNavBar />

      {/* Contenido Principal */}
      <div className="lp-content">
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px', minHeight: 'calc(100vh - 200px)' }}>
        <div className="mb-header">
          <span className="mb-title">Mis tickets (NFTs)</span>
          <div className="mb-tabs">
            <div 
              onClick={() => setActiveTab('proximos')}
              className={`mb-tab ${activeTab === 'proximos' ? 'active' : ''}`}
            >
              Mis Boletos
            </div>
          </div>
        </div>

        {!walletConnected ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(83,74,183,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Icons.Wallet size={36} color="#534AB7" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E1E1E', marginBottom: '8px' }}>Conecta tu wallet</h2>
            <p style={{ color: '#666', fontSize: '15px', maxWidth: '320px', lineHeight: 1.5 }}>Debes conectar tu wallet de Solana en la barra superior para acceder a tu bóveda de tickets NFT.</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#534AB7] mb-4"></div>
             <p style={{ color: '#666', fontSize: '15px' }}>Cargando tus boletos desde la red...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(83,74,183,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Icons.Ticket size={36} color="#534AB7" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1E1E1E', marginBottom: '8px' }}>No tienes boletos</h2>
            <p style={{ color: '#666', fontSize: '15px', maxWidth: '320px', lineHeight: 1.5 }}>Todavía no has comprado ningún boleto o la transacción sigue confirmándose.</p>
          </div>
        ) : (
          <div className="mb-grid">
            
            {tickets.map((ticket, i) => {
               const eventData = ticket.event;
               if (!eventData) return null;
               
               const dateObj = eventData.startDate ? new Date(eventData.startDate) : new Date();
               const dateStr = dateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
               const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
               
               const status = ticket.status; // Prisma string: "VALID", "USED", "CANCELLED", "LISTED_FOR_SALE"
               let statusText = 'Activo';
               let isUsed = false;
               let isResale = false;
               
               if (status === "USED" || status === "CHECKED_IN") { statusText = 'Usado/Verificado'; isUsed = true; }
               if (status === "LISTED_FOR_SALE") { statusText = 'En Reventa'; isResale = true; }
               if (status === "CANCELLED") { statusText = 'Cancelado'; isUsed = true; }

               // Parse zones from DB
               let zones = [];
               if (typeof eventData.zones === 'string') {
                 try { zones = JSON.parse(eventData.zones); } catch(e) {}
               } else if (Array.isArray(eventData.zones)) {
                 zones = eventData.zones;
               }
               const zoneName = zones.find((z: any) => z.id === ticket.zoneId)?.name || 'General';
               const coverImage = eventData.coverImageUrl || 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=400';

               return (
                  <div key={i} className={`mb-card ${isUsed ? 'past' : ''} ${isResale ? 'resale' : ''}`} onClick={() => onTicketClick(ticket.mintAddress)}>
                    <div className={`mb-cover ${isUsed ? 'past' : ''}`} style={{ backgroundImage: `url("${coverImage}")` }}>
                      <span className={`mb-badge ${isUsed ? 'past' : isResale ? 'resale' : 'active'}`}>{statusText}</span>
                      <p className="mb-name">{eventData.title}</p>
                    </div>
                    <div className="mb-body">
                      <div>
                        <p className="mb-date">{dateStr} · {timeStr}</p>
                        <p className="mb-meta">{zoneName}</p>
                      </div>
                      {!isUsed ? (
                        <span className="mb-icon-box">
                          <Icons.QrCode size={20} />
                        </span>
                      ) : (
                        <span className="mb-link">
                          Ver <Icons.ArrowRight size={14} />
                        </span>
                      )}
                    </div>
                  </div>
               );
            })}

            {/* Add More */}
            <div onClick={onBack} className="mb-add-card">
              <span className="mb-add-icon"><Icons.PlusCircle size={28} /></span>
              <p className="mb-add-text">Explora más eventos<br/>y arma tu colección</p>
            </div>

          </div>
        )}
        </div>
        <LandingFooter />
      </div>
    </div>
  );
}

