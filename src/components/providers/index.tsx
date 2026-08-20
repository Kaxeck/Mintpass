'use client';

import { SolanaProvider } from "@solana/react-hooks";
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { autoDiscover, createClient } from "@solana/client";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { Umi, publicKey } from "@metaplex-foundation/umi";
import { useWallet, useWalletActions } from "@solana/react-hooks";
import { WalletSession } from "@solana/client";
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { useSignTransaction as usePrivySolanaSignTransaction, useSignMessage as usePrivySolanaSignMessage, useWallets as usePrivySolanaWallets } from "@privy-io/react-auth/solana";

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

import { signerIdentity, createSignerFromKeypair } from "@metaplex-foundation/umi";

import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";

/**
 * Proveedor interno que inicializa UMI usando la wallet conectada
 * desde @solana/react-hooks, con puente via umi-kit-adapters.
 */
function UmiProvider({ children }: PropsWithChildren) {
  // Obtenemos el estado de la wallet desde @solana/react-hooks y Privy de forma segura
  const wallet = useWallet();
  const session: WalletSession | undefined = (wallet as any).session;

  let privyUser: any = null;
  try {
    const privy = usePrivy();
    privyUser = privy.user;
  } catch (e) {
    // Si la inicialización de Privy ocurre en el SSR/cliente inicial
  }

  // Obtenemos las wallets de Solana estándar de Privy (para Privy v3 con SWS)
  const solanaWalletsHook = usePrivySolanaWallets();
  const solanaWallets = solanaWalletsHook.wallets || [];
  
  // Obtenemos los hooks de Privy para firmar
  const { signTransaction: privySignTx } = usePrivySolanaSignTransaction();
  const { signMessage: privySignMsg } = usePrivySolanaSignMessage();

  const privyWalletAddress = privyUser?.wallet?.address || null;
  const walletAddressStr = privyWalletAddress || session?.account?.address?.toString() || null;
  
  const activeSolanaWallet = solanaWallets.find(w => w.address === walletAddressStr) || solanaWallets[0] || null;

  const umi = useMemo(() => {
    const umiInstance = createUmi(devnetUrl).use(mplCore()).use(mplToolbox());

    // Si hay una wallet de organizador conectada (Privy o Solana Adapter), se asigna como la identidad y pagador primario de Umi
    if (walletAddressStr) {
      try {
        const userPk = publicKey(walletAddressStr);
        const userWalletSigner = {
          publicKey: userPk,
          signTransaction: async (tx: any) => {
            const { VersionedTransaction } = await import('@solana/web3.js');
            const serialized = umiInstance.transactions.serialize(tx);
            const web3Tx = VersionedTransaction.deserialize(serialized);

            let signedWeb3Tx = null;
            const browserSolana = typeof window !== 'undefined' ? ((window as any).phantom?.solana || (window as any).solana || (window as any).solflare) : null;

            if (activeSolanaWallet) {
              const { signedTransaction } = await privySignTx({
                transaction: web3Tx.serialize(),
                wallet: activeSolanaWallet,
                chain: 'solana:devnet'
              });
              return umiInstance.transactions.deserialize(signedTransaction);
            } else if (browserSolana && typeof browserSolana.signTransaction === 'function') {
              if (!browserSolana.publicKey && typeof browserSolana.connect === 'function') {
                await browserSolana.connect();
              }
              signedWeb3Tx = await browserSolana.signTransaction(web3Tx);
            } else if ((session as any)?.signTransactions) {
              const signed = await (session as any).signTransactions([tx]);
              return signed[0];
            }

            if (signedWeb3Tx) {
              const signedBytes = typeof signedWeb3Tx.serialize === 'function' ? signedWeb3Tx.serialize() : signedWeb3Tx;
              return umiInstance.transactions.deserialize(signedBytes);
            }

            throw new Error("No se encontró una wallet activa para firmar la transacción.");
          },
          signAllTransactions: async (txs: any[]) => {
            const { VersionedTransaction } = await import('@solana/web3.js');
            const browserSolana = typeof window !== 'undefined' ? ((window as any).phantom?.solana || (window as any).solana || (window as any).solflare) : null;

            if (activeSolanaWallet) {
              const inputs = txs.map(tx => {
                const serialized = umiInstance.transactions.serialize(tx);
                const web3Tx = VersionedTransaction.deserialize(serialized);
                return {
                  transaction: web3Tx.serialize(),
                  wallet: activeSolanaWallet,
                  chain: 'solana:devnet'
                };
              });
              const signedResults = await privySignTx(...inputs);
              return signedResults.map((res: any) => umiInstance.transactions.deserialize(res.signedTransaction));
            }

            const signedResult = [];
            for (const tx of txs) {
              const serialized = umiInstance.transactions.serialize(tx);
              const web3Tx = VersionedTransaction.deserialize(serialized);
              let signedWeb3Tx = null;

              if (browserSolana && typeof browserSolana.signTransaction === 'function') {
                if (!browserSolana.publicKey && typeof browserSolana.connect === 'function') {
                  await browserSolana.connect();
                }
                signedWeb3Tx = await browserSolana.signTransaction(web3Tx);
              }

              if (signedWeb3Tx) {
                const signedBytes = typeof signedWeb3Tx.serialize === 'function' ? signedWeb3Tx.serialize() : signedWeb3Tx;
                signedResult.push(umiInstance.transactions.deserialize(signedBytes));
              } else {
                signedResult.push(tx);
              }
            }
            return signedResult;
          },
          signMessage: async (msg: Uint8Array) => {
            const browserSolana = typeof window !== 'undefined' ? ((window as any).phantom?.solana || (window as any).solana || (window as any).solflare) : null;

            if (activeSolanaWallet) {
              const { signature } = await privySignMsg({
                message: msg,
                wallet: activeSolanaWallet
              });
              return signature;
            } else if (browserSolana && typeof browserSolana.signMessage === 'function') {
              if (!browserSolana.publicKey && typeof browserSolana.connect === 'function') {
                await browserSolana.connect();
              }
              return await browserSolana.signMessage(msg);
            }
            return msg;
          }
        };

        umiInstance.use(signerIdentity(userWalletSigner));
      } catch (e) {
        // Fallback silencioso
      }
    }

    return umiInstance;
  }, [session, walletAddressStr, activeSolanaWallet, privySignTx, privySignMsg]);

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
        loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord'],
        appearance: {
          theme: 'dark',
          accentColor: '#4BAA46',
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
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
      <SolanaProvider client={client}>
        <UmiProvider>
          {children}
        </UmiProvider>
      </SolanaProvider>
    </PrivyProvider>
  );
}