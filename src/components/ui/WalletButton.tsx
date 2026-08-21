'use client';

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { Wallet, LogOut } from "lucide-react";

import { useWalletConnection } from "@solana/react-hooks";

interface WalletButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function WalletButton({ className, style }: WalletButtonProps) {
  const { login, logout, authenticated, ready, user } = usePrivy();
  const { disconnect } = useWalletConnection();
  const [showDropdown, setShowDropdown] = useState(false);

  // Intentar obtener la dirección de Solana
  const privySolanaWallet = (user?.linkedAccounts?.find(
    (account: any) => account.type === 'wallet' && account.chainType === 'solana'
  ) as any)?.address;

  let displayValue = null;
  if (user) {
    if (privySolanaWallet) {
      displayValue = `${privySolanaWallet.slice(0, 4)}...${privySolanaWallet.slice(-4)}`;
    } else if (user.email?.address) {
      displayValue = user.email.address;
    }
  }

  if (!ready) {
    return (
      <div className={className} style={{ ...style, opacity: 0.5 }}>
        <span style={{ fontSize: 13, color: '#8A8880' }}>Cargando...</span>
      </div>
    );
  }

  if (authenticated && displayValue) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          className={className}
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#14F195',
            boxShadow: '0 0 8px rgba(20, 241, 149, 0.4)',
          }} />
          <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayValue}
          </span>
        </button>
        
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            background: '#FFFFFF',
            border: '1px solid #D3D1C7',
            borderRadius: 12,
            padding: 8,
            minWidth: 160,
            zIndex: 100,
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
          }}>
            <button
              onClick={() => { 
                logout(); 
                if (disconnect) disconnect();
                setShowDropdown(false); 
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#B0523E',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: 8,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F7F8F7'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={className}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
      }}
      onClick={login}
    >
      <Wallet size={16} />
      Conectar
    </button>
  );
}