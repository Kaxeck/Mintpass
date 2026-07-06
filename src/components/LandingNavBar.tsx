import React from 'react';
import WalletMultiButton from './WalletButton';
import { usePrivy } from "@privy-io/react-auth";
import { useWalletSession } from "@solana/react-hooks";
import { useRouter } from "next/navigation";

interface LandingNavBarProps {
  onGoToExplore?: () => void;
  onGoToMyTickets?: () => void;
  onGoToOrganizer?: () => void;
}

export function LandingNavBar({ onGoToExplore, onGoToMyTickets, onGoToOrganizer }: LandingNavBarProps) {
  const { authenticated, user } = usePrivy();
  const session = useWalletSession();
  const router = useRouter();

  const walletAddressStr = user?.wallet?.address || session?.account?.address?.toString() || null;
  const isConnected = authenticated || !!walletAddressStr;

  return (
    <header className="lp-nav">
      <div className="lp-nav-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
        <span className="lp-nav-brand" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
          <img src="/icon.png" alt="Logo" />
          <span>Mint<span style={{ color: '#4BAA46' }}>pass</span></span>
        </span>
        <div className="lp-nav-right">
          <nav className="lp-nav-links">
            <button 
              type="button"
              className="lp-nav-btn" 
              onClick={() => onGoToExplore ? onGoToExplore() : router.push('/explore')}
            >
              Explorar
            </button>
            {isConnected && (
              <button type="button" className="lp-nav-btn" onClick={() => onGoToMyTickets ? onGoToMyTickets() : router.push('/tickets')}>
                Mis tickets
              </button>
            )}
            
            {isConnected ? (
              <button type="button" className="lp-nav-btn" onClick={() => router.push('/dashboard')}>
                Dashboard
              </button>
            ) : (
              <button type="button" className="lp-nav-btn" onClick={() => onGoToOrganizer ? onGoToOrganizer() : router.push('/organizers')}>
                Organizadores
              </button>
            )}
            
          </nav>
          <WalletMultiButton style={{ border: '0.5px solid #333333', borderRadius: '8px', padding: '6px 14px', color: '#FFFFFF', background: 'transparent', fontSize: '13px', fontFamily: 'inherit', height: 'auto', lineHeight: 1 }} />
        </div>
      </div>
    </header>
  );
}
