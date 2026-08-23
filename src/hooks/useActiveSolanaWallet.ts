'use client';

import { usePrivy } from "@privy-io/react-auth";
import { useWallets as usePrivySolanaWallets, type ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { useMemo } from "react";

export interface ActiveWalletState {
  walletAddress: string | null;
  activeSolanaWallet: ConnectedStandardSolanaWallet | null;
  isExternal: boolean;
  isEmbedded: boolean;
  walletClientType: string | null;
  authenticated: boolean;
  ready: boolean;
  user: any;
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

/**
 * Hook centralizado para resolver la wallet de Solana activa en Mintpass.
 * 
 * Regla de prioridad estricta:
 * 1. Wallets externas de Solana (Phantom, Solflare, Backpack, etc.) conectadas vía Wallet Standard / Injected.
 * 2. Cuentas vinculadas de Solana externas en user.linkedAccounts.
 * 3. Wallet embebida de Solana creada por Privy (fallback para usuarios Web2 que entraron con Email/Google).
 */
export function useActiveSolanaWallet(): ActiveWalletState {
  const { user, authenticated, ready, login, logout, getAccessToken } = usePrivy();
  const { wallets: solanaWallets } = usePrivySolanaWallets();

  return useMemo(() => {
    if (!ready || !authenticated || !user) {
      return {
        walletAddress: null,
        activeSolanaWallet: null,
        isExternal: false,
        isEmbedded: false,
        walletClientType: null,
        authenticated,
        ready,
        user,
        login,
        logout,
        getAccessToken,
      };
    }

    // 1. Buscar en los adaptadores estándar activos de Solana (useWallets)
    // Filtramos las wallets externas (cuyo nombre no sea 'privy')
    const externalStandardWallet = (solanaWallets || []).find((w) => {
      const name = w.standardWallet?.name?.toLowerCase() || '';
      return name !== 'privy' && !name.includes('privy');
    });

    // 2. Buscar en linkedAccounts de Privy una wallet externa de Solana
    const externalLinkedWallet = (user.linkedAccounts || []).find((acc: any) => {
      const isSolana = acc.type === 'wallet' && acc.chainType === 'solana';
      const isNotPrivy =
        acc.walletClientType !== 'privy' &&
        acc.walletClientType !== 'privy-v2' &&
        acc.connectorType !== 'embedded';
      return isSolana && isNotPrivy;
    });

    // 3. Buscar la wallet embebida de Privy (como fallback para usuarios Web2 sin wallet externa)
    const embeddedStandardWallet = (solanaWallets || []).find((w) => {
      const name = w.standardWallet?.name?.toLowerCase() || '';
      return name === 'privy' || name.includes('privy');
    });

    const embeddedLinkedWallet = (user.linkedAccounts || []).find((acc: any) => {
      const isSolana = acc.type === 'wallet' && acc.chainType === 'solana';
      const isPrivy =
        acc.walletClientType === 'privy' ||
        acc.walletClientType === 'privy-v2' ||
        acc.connectorType === 'embedded';
      return isSolana && isPrivy;
    });

    // Fallbacks genéricos si no se categorizó claramente
    const fallbackStandardWallet = (solanaWallets || [])[0] || null;
    const fallbackLinkedWallet = (user.linkedAccounts || []).find(
      (acc: any) => acc.type === 'wallet' && acc.chainType === 'solana'
    );

    // Seleccionamos la instancia estándar para firmas de transacciones, 
    // priorizando las que están explícitamente vinculadas a la cuenta del usuario
    const matchedExternalStandard = externalLinkedWallet 
      ? (solanaWallets || []).find(w => w.address === (externalLinkedWallet as any).address)
      : null;

    const matchedEmbeddedStandard = embeddedLinkedWallet
      ? (solanaWallets || []).find(w => w.address === (embeddedLinkedWallet as any).address)
      : null;

    const chosenStandardWallet =
      matchedExternalStandard || matchedEmbeddedStandard || externalStandardWallet || embeddedStandardWallet || fallbackStandardWallet || null;

    // Seleccionamos la dirección en orden estricto de prioridad (Las vinculadas al usuario SIEMPRE ganan)
    const chosenAddress =
      (externalLinkedWallet as any)?.address ||
      (embeddedLinkedWallet as any)?.address ||
      externalStandardWallet?.address ||
      embeddedStandardWallet?.address ||
      fallbackStandardWallet?.address ||
      (fallbackLinkedWallet as any)?.address ||
      null;

    const isExternal = Boolean((externalLinkedWallet as any)?.address || externalStandardWallet?.address);
    const isEmbedded = !isExternal && Boolean((embeddedLinkedWallet as any)?.address || embeddedStandardWallet?.address);
    
    const clientType =
      (externalLinkedWallet as any)?.walletClientType ||
      externalStandardWallet?.standardWallet?.name ||
      (isEmbedded ? 'privy' : null);

    return {
      walletAddress: chosenAddress,
      activeSolanaWallet: chosenStandardWallet,
      isExternal,
      isEmbedded,
      walletClientType: clientType,
      authenticated,
      ready,
      user,
      login,
      logout,
      getAccessToken,
    };
  }, [user, authenticated, ready, solanaWallets, login, logout, getAccessToken]);
}
