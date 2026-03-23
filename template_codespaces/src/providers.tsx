import { SolanaProvider } from "@solana/react-hooks";
import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { autoDiscover, createClient } from "@solana/client";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
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

// Proveedor interno para UMI
function UmiProvider({ children }: PropsWithChildren) {
  const umi = useMemo(() => {
    // Inicializamos UMI apuntando a devnet y añadimos el plugin de mpl-core por defecto
    const umiInstance = createUmi("https://api.devnet.solana.com").use(mplCore());
    
    return umiInstance;
  }, []);

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

