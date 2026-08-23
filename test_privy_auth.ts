import { PrivyClient } from "@privy-io/node";
const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || "",
  appSecret: process.env.PRIVY_APP_SECRET || ""
});
async function main() {
  console.log("App ID:", process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  console.log("Secret Length:", process.env.PRIVY_APP_SECRET?.length);
  try {
    const users = await privy.users().list();
    console.log("SUCCESS! Got users:", users.data.length);
  } catch (e: any) {
    console.error("FAIL:", e.status, e.message);
  }
}
main();
