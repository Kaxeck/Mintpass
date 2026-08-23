import { PrivyClient } from "@privy-io/node";
import { cookies, headers } from "next/headers";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || "",
  appSecret: process.env.PRIVY_APP_SECRET || ""
});

export async function verifyAuth(expectedWalletAddress: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get('privy-token')?.value;
    
    // Fallback: Si no hay cookie, intentar leer del header de Authorization
    if (!token) {
      const headersList = await headers();
      const authHeader = headersList.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      console.error("verifyAuth: No se encontro privy-token en cookies ni header Authorization");
      return false;
    }
    
    const verifiedClaims = await privy.utils().auth().verifyAccessToken(token);
    
    // Find the user by the expected wallet address
    let userByWallet;
    try {
      userByWallet = await privy.users().getByWalletAddress({ address: expectedWalletAddress });
    } catch (e) {
      console.error(`verifyAuth: Wallet ${expectedWalletAddress} no encontrada en Privy o error de red`);
      return false;
    }
    
    // Check if the user who signed in (token) is the same user who owns the wallet
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
