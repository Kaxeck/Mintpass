import { PrivyClient } from "@privy-io/node";
import { cookies, headers } from "next/headers";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || "",
  appSecret: process.env.PRIVY_APP_SECRET || ""
});

/**
 * Verifica la sesión de Privy de un usuario.
 * @param expectedWalletAddress La wallet que debe coincidir con el usuario.
 * @param providedToken (Opcional - Para el MVP) El token JWT pasado explícitamente desde el cliente.
 */
export async function verifyAuth(expectedWalletAddress: string, providedToken?: string): Promise<boolean> {
  try {
    // 1. Usar el token proveído manualmente (ideal para MVP en Vercel sin dominio propio)
    let token = providedToken;

    // 2. [PRODUCCIÓN] Si no hay token manual, intentamos leer la cookie HttpOnly
    // Nota: Esto requerirá habilitar "HttpOnly Cookies" en el dashboard de Privy
    // cuando tengas un dominio propio (ej. mintpass.com).
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('privy-token')?.value;
    }
    
    // 3. Fallback: Intentar leer del header de Authorization
    if (!token) {
      const headersList = await headers();
      const authHeader = headersList.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      console.error("verifyAuth: No se encontro token (ni manual, ni cookie, ni header)");
      return false;
    }
    
    const verifiedClaims = await privy.utils().auth().verifyAccessToken(token);
    
    // Obtenemos el usuario correspondiente a la wallet address
    let userByWallet;
    try {
      userByWallet = await privy.users().getByWalletAddress({ address: expectedWalletAddress });
    } catch (e) {
      console.error(`verifyAuth: Wallet ${expectedWalletAddress} no encontrada en Privy o error de red`);
      return false;
    }
    
    // Validamos que el usuario que firma sea el dueño de la wallet
    if (userByWallet.id !== verifiedClaims.user_id) {
      console.error(`verifyAuth: Wallet ${expectedWalletAddress} belongs to ${userByWallet.id}, not ${verifiedClaims.user_id}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("verifyAuth Error:", error);
    return false;
  }
}
