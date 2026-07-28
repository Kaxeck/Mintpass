'use client';

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { Wallet } from "lucide-react";

import { useWalletConnection } from "@solana/react-hooks";

interface WalletButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function WalletButton({ className, style }: WalletButtonProps) {
  const { login, logout, authenticated, ready, user } = usePrivy();
  const { disconnect } = useWalletConnection();
  const [showDropdown, setShowDropdown] = useState(false);

  // Intentar obtener una dirección para mostrar (wallet o email)
  let displayValue = null;
  if (user) {
    if (user.wallet?.address) {
      displayValue = `${user.wallet.address.slice(0, 4)}...${user.wallet.address.slice(-4)}`;
    } else if (user.email?.address) {
      displayValue = user.email.address;
    }
  }

  if (!ready) {
    return (
      <div className={className} style={{ ...style, opacity: 0.5 }}>
        <span style={{ fontSize: 12, color: '#AFA9EC' }}>Cargando...</span>
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
            background: '#5DCAA5',
            boxShadow: '0 0 8px rgba(93, 202, 165, 0.5)',
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
            background: '#12122a',
            border: '0.5px solid #2a2a4a',
            borderRadius: 12,
            padding: 8,
            minWidth: 160,
            zIndex: 100,
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
                color: '#E24B4A',
                fontSize: 12,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: 8,
                textAlign: 'left',
              }}
            >
              Cerrar sesión
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