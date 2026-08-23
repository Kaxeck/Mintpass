'use client';

import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { autoDiscover, createClient } from "@solana/client";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { Umi, publicKey } from "@metaplex-foundation/umi";
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { 
  useSignTransaction as usePrivySolanaSignTransaction, 
  useSignMessage as usePrivySolanaSignMessage, 
  useWallets as usePrivySolanaWallets,
  toSolanaWalletConnectors
} from "@privy-io/react-auth/solana";

const devnetUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

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

import { signerIdentity, createSignerFromKeypair } from "@metaplex-foundation/umi";

import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";

import { useActiveSolanaWallet } from "@/hooks/useActiveSolanaWallet";

/**
 * Proveedor interno que inicializa UMI usando la wallet conectada
 * dando prioridad absoluta a wallets externas (Phantom, Solflare, etc.).
 */
function UmiProvider({ children }: PropsWithChildren) {
  const { walletAddress, activeSolanaWallet } = useActiveSolanaWallet();
  
  // Obtenemos los hooks de Privy para firmar
  const { signTransaction: privySignTx } = usePrivySolanaSignTransaction();
  const { signMessage: privySignMsg } = usePrivySolanaSignMessage();

  const umi = useMemo(() => {
    const umiInstance = createUmi(devnetUrl).use(mplCore()).use(mplToolbox());

    // Si hay una wallet conectada, se asigna como la identidad y pagador primario de Umi
    if (walletAddress && activeSolanaWallet) {
      try {
        const userPk = publicKey(walletAddress);
        const userWalletSigner = {
          publicKey: userPk,
          signTransaction: async (tx: any) => {
            const { VersionedTransaction } = await import('@solana/web3.js');
            const serialized = umiInstance.transactions.serialize(tx);
            const web3Tx = VersionedTransaction.deserialize(serialized);

            const { signedTransaction } = await privySignTx({
              transaction: web3Tx.serialize(),
              wallet: activeSolanaWallet,
              chain: 'solana:devnet',
              options: {
                uiOptions: {
                  description: "Por favor autoriza esta transacción para interactuar con Mintpass de forma segura.",
                  buttonText: "Aprobar y Continuar"
                }
              }
            });
            return umiInstance.transactions.deserialize(signedTransaction);
          },
          signAllTransactions: async (txs: any[]) => {
            const { VersionedTransaction } = await import('@solana/web3.js');
            const inputs = txs.map(tx => {
              const serialized = umiInstance.transactions.serialize(tx);
              const web3Tx = VersionedTransaction.deserialize(serialized);
              return {
                transaction: web3Tx.serialize(),
                wallet: activeSolanaWallet,
                chain: 'solana:devnet' as const,
                options: {
                  uiOptions: {
                    description: "Se requiere autorizar un lote de transacciones para interactuar con Mintpass.",
                    buttonText: "Aprobar Todas"
                  }
                }
              };
            });
            const signedResults = await privySignTx(...inputs);
            return signedResults.map((res: any) => umiInstance.transactions.deserialize(res.signedTransaction));
          },
          signMessage: async (msg: Uint8Array) => {
            const { signature } = await privySignMsg({
              message: msg,
              wallet: activeSolanaWallet
            });
            return signature;
          }
        };

        umiInstance.use(signerIdentity(userWalletSigner));
      } catch (e) {
        console.error("Error setting Umi identity:", e);
      }
    }

    return umiInstance;
  }, [walletAddress, activeSolanaWallet, privySignTx, privySignMsg]);

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
        loginMethods: ['wallet', 'email', 'google', 'twitter', 'discord'],
        appearance: {
          theme: 'dark',
          accentColor: '#4BAA46',
          walletList: ['phantom', 'solflare', 'backpack', 'metamask', 'coinbase_wallet'],
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
          ethereum: {
            createOnLogin: 'off',
          },
        },
        solana: {
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com'),
            },
            'solana:devnet': {
              rpc: createSolanaRpc(devnetUrl),
              rpcSubscriptions: createSolanaRpcSubscriptions(devnetUrl.replace('http', 'ws')),
            },
          },
        },
      }}
    >
      <UmiProvider>
        {children}
      </UmiProvider>
    </PrivyProvider>
  );
}