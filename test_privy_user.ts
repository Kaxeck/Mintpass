import { PrivyClient } from "@privy-io/node";
const privy = new PrivyClient({appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '', appSecret: process.env.PRIVY_APP_SECRET || ''});
async function main() {
  const users = await privy.users().list();
  if (users.data.length > 0) {
    const user = users.data[0];
    console.log(Object.keys(user));
  }
}
main().catch(console.error);
