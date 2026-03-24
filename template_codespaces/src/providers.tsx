import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { autoDiscover, createClient } from "@solana/client";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { Umi } from "@metaplex-foundation/umi";

// Nuevas dependencias agregadas como desarrollador:
// Necesitamos estas librerías clásicas para mostrar el modal de conexión 
// y obtener el signer que firmará las transacciones en Devnet.
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

const devnetUrl = "https://api.devnet.solana.com";

const client = createClient({
  endpoint: devnetUrl,
  walletConnectors: autoDiscover(),
});

// Creamos el contexto estricto para almacenar la instancia de UMI
const UmiContext = createContext<Umi | null>(null);

// Hook personalizado para acceder a la instancia de UMI en toda la app
export function useUmi(): Umi {
  const context = useContext(UmiContext);
  if (!context) {
    throw new Error("useUmi debe ser usado dentro de un UmiProvider");
  }
  return context;
}

// Proveedor interno para UMI
function UmiProvider({ children }: PropsWithChildren) {
  // Extraemos la wallet que el usuario conectó usando el modal de React UI
  const wallet = useWallet();

  const umi = useMemo(() => {
    // Inicializamos UMI apuntando a devnet y añadimos el plugin de mpl-core por defecto
    const umiInstance = createUmi(devnetUrl).use(mplCore());
    
    // Developer comment: Inyectamos la wallet conectada para que UMI sepa quién 
    // pagará las fees y a nombre de quién mintear el NFT.
    if (wallet && wallet.publicKey) {
      umiInstance.use(walletAdapterIdentity(wallet));
    }
    
    return umiInstance;
  }, [wallet]);

  return <UmiContext.Provider value={umi}>{children}</UmiContext.Provider>;
}

export function Providers({ children }: PropsWithChildren) {
  // Developer comment: El Wallet Adapter moderno de Solana usa "wallets={[]}" porque
  // inyecta "Standard Wallets" del navegador directamente gracias al EIP-6963 de Solana.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={devnetUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaProvider client={client}>
            <UmiProvider>
              {children}
            </UmiProvider>
          </SolanaProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

