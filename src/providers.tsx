'use client';

import { SolanaProvider } from "@solana/react-hooks";
import { PrivyProvider } from '@privy-io/react-auth';
import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { autoDiscover, createClient } from "@solana/client";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { Umi, publicKey } from "@metaplex-foundation/umi";
import { useWallet, useWalletActions } from "@solana/react-hooks";
import { WalletSession } from "@solana/client";

const devnetUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Creamos el cliente de Solana Kit con auto-descubrimiento de wallets estándar
const client = createClient({
  endpoint: devnetUrl,
  walletConnectors: autoDiscover(),
});

// Contexto para almacenar la instancia de UMI (compatible con MPL Core)
const UmiContext = createContext<Umi | null>(null);

/**
 * Hook personalizado para acceder a la instancia de UMI en toda la app.
 * UMI se usa exclusivamente para interacciones con MPL Core.
 */
export function useUmi(): Umi {
  const context = useContext(UmiContext);
  if (!context) {
    throw new Error("useUmi debe ser usado dentro de un UmiProvider");
  }
  return context;
}

/**
 * Proveedor interno que inicializa UMI usando la wallet conectada
 * desde @solana/react-hooks, con puente via umi-kit-adapters.
 */
function UmiProvider({ children }: PropsWithChildren) {
  // Obtenemos el estado de la wallet desde @solana/react-hooks
  const wallet = useWallet();
  const session: WalletSession | undefined = (wallet as any).session;

  const umi = useMemo(() => {
    const umiInstance = createUmi(devnetUrl).use(mplCore());

    // Si hay una wallet conectada, registramos un signer custom
    // que usa @solana/kit para firmar transacciones
    if (session?.account?.address) {
      const address = session.account.address.toString();
      // Registramos la identidad usando umi-kit-adapters para convertir la dirección
      try {
        const umiPk = publicKey(address);
        // Umi usará esta identidad para las operaciones de MPL Core
        (umiInstance as any).payer = umiPk;
        (umiInstance as any).identity = { publicKey: umiPk };
      } catch (e) {
        console.warn("No se pudo configurar la identidad UMI desde la wallet de Kit:", e);
      }
    }

    return umiInstance;
  }, [session]);

  return <UmiContext.Provider value={umi}>{children}</UmiContext.Provider>;
}


/**
 * Proveedor principal que envuelve la aplicación con:
 * - PrivyProvider → autenticación y wallets embebidas
 * - SolanaProvider (@solana/react-hooks) → manejo de wallets externas y RPC
 * - UmiProvider → instancia de UMI para MPL Core
 */
export function Providers({ children }: PropsWithChildren) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord', 'apple'],
        appearance: {
          theme: 'dark',
          accentColor: '#4BAA46',
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <SolanaProvider client={client}>
        <UmiProvider>
          {children}
        </UmiProvider>
      </SolanaProvider>
    </PrivyProvider>
  );
}