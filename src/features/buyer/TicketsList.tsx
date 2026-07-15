'use client';
import { useState } from 'react';
import * as Icons from "lucide-react";
import WalletMultiButton from "../../components/WalletButton";
import { useWalletSession } from "@solana/react-hooks";
import { usePrivy } from "@privy-io/react-auth";
import { LandingNavBar } from "../../components/LandingNavBar";
import { LandingFooter } from "../../components/LandingFooter";
import "../../Home.css";
import "../../styles/TicketsList.css";

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
              Próximos · 2
            </div>
            <div 
              onClick={() => setActiveTab('pasados')}
              className={`mb-tab ${activeTab === 'pasados' ? 'active' : ''}`}
            >
              Pasados · 2
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
        ) : (
          <div className="mb-grid">
            
            {activeTab === 'proximos' && (
              <>
                {/* Próximo 1 */}
                <div className="mb-card" onClick={() => onTicketClick('mock1')}>
                  <div className="mb-cover" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400")' }}>
                    <span className="mb-badge active">Activo</span>
                    <p className="mb-name">Festival Sonora Norte</p>
                  </div>
                  <div className="mb-body">
                    <div>
                      <p className="mb-date">15 ago · 20:00</p>
                      <p className="mb-meta">Zona VIP · #0842</p>
                    </div>
                    <span className="mb-icon-box">
                      <Icons.QrCode size={20} />
                    </span>
                  </div>
                </div>

                {/* Próximo 2 */}
                <div className="mb-card resale" onClick={() => onTicketClick('mock2')}>
                  <div className="mb-cover" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=400")' }}>
                    <span className="mb-badge resale">En reventa</span>
                    <p className="mb-name">Noche de jazz</p>
                  </div>
                  <div className="mb-body">
                    <div>
                      <p className="mb-date">22 ago · 21:00</p>
                      <p className="mb-meta">General · en mercado oficial</p>
                    </div>
                    <span className="mb-link">
                      Ver <Icons.ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'pasados' && (
              <>
                {/* Pasado 1 */}
                <div className="mb-card past">
                  <div className="mb-cover past" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=400")' }}>
                    <span className="mb-badge past">Finalizado</span>
                    <p className="mb-name">Feria Gastronómica</p>
                  </div>
                  <div className="mb-body">
                    <div>
                      <p className="mb-date">10 jul · 12:00</p>
                      <p className="mb-meta">Pase de 1 día</p>
                    </div>
                  </div>
                </div>

                {/* Pasado 2 */}
                <div className="mb-card past">
                  <div className="mb-cover past" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1507676184212-d0330a15233c?q=80&w=400")' }}>
                    <span className="mb-badge past">Finalizado</span>
                    <p className="mb-name">Obra Teatral</p>
                  </div>
                  <div className="mb-body">
                    <div>
                      <p className="mb-date">05 jun · 18:00</p>
                      <p className="mb-meta">Balcón · #012</p>
                    </div>
                  </div>
                </div>
              </>
            )}

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

