import { PrivyClient } from "@privy-io/node";
const privy = new PrivyClient({appId: '1', appSecret: '2'});
console.log(typeof privy.users()._get);
