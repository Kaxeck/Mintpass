import { PrivyClient } from "@privy-io/node";
import "server-only";

if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
  console.warn("⚠️ Privy env vars are missing. Auth might not work correctly.");
}

export const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || "missing-app-id",
  appSecret: process.env.PRIVY_APP_SECRET || "missing-app-secret"
});
