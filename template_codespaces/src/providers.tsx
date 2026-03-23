import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { autoDiscover, createClient } from "@solana/client";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { useWallet } from "@solana/wallet-adapter-react";
import { Umi } from "@metaplex-foundation/umi";

const client = createClient({
  endpoint: "https://api.devnet.solana.com",
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

// Proveedor interno para UMI que se nutre de la wallet conectada
function UmiProvider({ children }: PropsWithChildren) {
  // Obtenemos la wallet activa del Wallet Adapter
  const wallet = useWallet();

  const umi = useMemo(() => {
    // Inicializamos UMI apuntando a devnet y añadimos el plugin de mpl-core por defecto
    const umiInstance = createUmi("https://api.devnet.solana.com").use(mplCore());
    
    // Si la wallet está conectada, la usamos como signer dinámico en UMI
    if (wallet && wallet.publicKey) {
      umiInstance.use(walletAdapterIdentity(wallet));
    }
    
    return umiInstance;
  }, [wallet]);

  return <UmiContext.Provider value={umi}>{children}</UmiContext.Provider>;
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <SolanaProvider client={client}>
      <UmiProvider>
        {children}
      </UmiProvider>
    </SolanaProvider>
  );
}

