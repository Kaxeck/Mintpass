'use client';

import { useWalletConnection, useWalletModalState } from "@solana/react-hooks";
import { useState, useEffect } from "react";
import { Wallet } from "lucide-react";

interface WalletButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Botón de wallet usando @solana/react-hooks (@solana/kit v5).
 * Reemplaza al antiguo WalletMultiButton de @solana/wallet-adapter-react-ui.
 */
export default function WalletButton({ className, style }: WalletButtonProps) {
  const { 
    wallet, 
    connected, 
    connecting, 
    connectors, 
    connect, 
    disconnect,
    isReady 
  } = useWalletConnection();

  const modal = useWalletModalState();
  const [showDropdown, setShowDropdown] = useState(false);

  // Truncar dirección de wallet para mostrar
  const shortAddress = wallet?.account?.address
    ? `${wallet.account.address.toString().slice(0, 4)}...${wallet.account.address.toString().slice(-4)}`
    : null;

  // Si no está listo (SSR), mostramos skeleton
  if (!isReady) {
    return (
      <div className={className} style={{ ...style, opacity: 0.5 }}>
        <span style={{ fontSize: 12, color: '#AFA9EC' }}>Cargando...</span>
      </div>
    );
  }

  // Si está conectado, mostramos la dirección con opción de desconectar
  if (connected && wallet) {
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
          <span>{shortAddress}</span>
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
              onClick={() => { disconnect(); setShowDropdown(false); }}
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
              Desconectar
            </button>
          </div>
        )}
      </div>
    );
  }

  // Si hay wallets disponibles, mostramos selector
  return (
    <>
      <button
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
        }}
        disabled={connecting}
        onClick={() => modal.toggle()}
      >
        {connecting ? (
          <>
            <div className="wallet-dot" />
            Conectando...
          </>
        ) : (
          <>
            <Wallet size={16} />
            Conectar wallet
          </>
        )}
      </button>

      {/* Modal de selección de wallet */}
      {modal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={modal.close}
          />
          <div style={{
            position: 'relative',
            zIndex: 201,
            background: 'linear-gradient(150deg, #0d0d1e, #10102a)',
            border: '1px solid rgba(42,42,74,0.6)',
            borderRadius: 20,
            width: '100%',
            maxWidth: 360,
            padding: 24,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              Conectar wallet
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connectors.length === 0 && (
                <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: 16 }}>
                  No se detectaron wallets. Instala Phantom, Backpack o Solflare.
                </div>
              )}
              {connectors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    connect(c.id);
                    modal.close();
                  }}
                  style={{
                    background: 'rgba(18,18,42,0.6)',
                    border: '0.5px solid rgba(83,74,183,0.4)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    fontSize: 14,
                    color: '#AFA9EC',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.2s',
                  }}
                >
                  {c.icon && (
                    <img src={c.icon} alt="" style={{ width: 24, height: 24, borderRadius: 4 }} />
                  )}
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={modal.close}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: 12,
                cursor: 'pointer',
                padding: 8,
                marginTop: 12,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}