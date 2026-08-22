'use client';

import { useActiveSolanaWallet } from "@/hooks/useActiveSolanaWallet";
import { useState } from "react";
import { Wallet, LogOut, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface WalletButtonProps {
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark';
  dropdownPosition?: 'top' | 'bottom';
}

export default function WalletButton({ className, style, theme = 'light', dropdownPosition = 'bottom' }: WalletButtonProps) {
  const { walletAddress, isExternal, walletClientType, login, logout, authenticated, ready, user } = useActiveSolanaWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  let displayValue = 'Conectado';
  if (user) {
    if (walletAddress) {
      displayValue = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    } else if (user.email?.address) {
      displayValue = user.email.address;
    } else if (user.google?.email) {
      displayValue = user.google.email;
    } else if (user.twitter?.username) {
      displayValue = `@${user.twitter.username}`;
    } else if (user.id) {
      displayValue = `${user.id.slice(0, 6)}...`;
    }
  }

  const isDark = theme === 'dark';

  if (!ready) {
    return (
      <div className={className} style={{ ...style, opacity: 0.5 }}>
        <span style={{ fontSize: 13, color: isDark ? '#B4B2A9' : '#8A8880' }}>Cargando...</span>
      </div>
    );
  }

  if (authenticated) {
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
            ...(dropdownPosition === 'top' ? { bottom: '100%', marginBottom: 8 } : { top: '100%', marginTop: 8 }),
            right: 0,
            background: isDark ? '#2C2C2A' : '#FFFFFF',
            border: isDark ? '1px solid #3A3A38' : '1px solid #D3D1C7',
            borderRadius: 12,
            padding: 8,
            minWidth: 200,
            zIndex: 100,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
          }}>
            {walletAddress && (
              <div style={{
                padding: '8px 10px',
                marginBottom: 6,
                borderBottom: isDark ? '1px solid #3A3A38' : '1px solid #ECEAE2',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#9B9990' : '#73726C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isExternal ? (walletClientType ? walletClientType.toUpperCase() : 'WALLET EXTERNA') : 'WALLET PRIVY'}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: isExternal ? 'rgba(20, 241, 149, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                    color: isExternal ? '#14F195' : (isDark ? '#D3D1C7' : '#5C5B56')
                  }}>
                    {isExternal ? 'Conectada' : 'Embebida'}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: isDark ? '#F5F5F3' : '#1A1A18', wordBreak: 'break-all' }}>
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                </div>
              </div>
            )}

            <button
              onClick={async () => { 
                setShowDropdown(false); 
                await logout(); 
                router.push('/');
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: isDark ? '#E24B4A' : '#B0523E',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '8px 10px',
                borderRadius: 8,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#3A3A38' : '#F7F8F7'}
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