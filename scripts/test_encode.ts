import { BorshCoder } from "@coral-xyz/anchor";
import { MINTPASS_IDL } from "../src/lib/anchor";
import { BN } from "bn.js";

const coder = new BorshCoder(MINTPASS_IDL);

const args = {
  name: "test",
  eventTimestamp: new BN(123456789),
  venue: "venue",
  category: "category",
  zones: [{
    name: "zone", capacity: 10, price: new BN(100), ticketsSold: 0
  }],
  allowResale: false,
  resaleCapLimit: 0,
  isSoulbound: true,
  allowRefunds: false,
  refundTimeLimit: 0,
  identityLimit: 0
};
const buf1 = coder.instruction.encode("create_event", args);

const args2 = {
  name: "test",
  event_timestamp: new BN(123456789),
  venue: "venue",
  category: "category",
  zones: [{
    name: "zone", capacity: 10, price: new BN(100), tickets_sold: 0
  }],
  allow_resale: false,
  resale_cap_limit: 0,
  is_soulbound: true,
  allow_refunds: false,
  refund_time_limit: 0,
  identity_limit: 0
};
const buf2 = coder.instruction.encode("create_event", args2);

console.log("Buffer 1 (camel):", buf1.toString('hex'));
console.log("Buffer 2 (snake):", buf2.toString('hex'));
console.log("Equal?", buf1.equals(buf2));
