import { sha256 } from "@noble/hashes/sha256";
function getDiscriminator(name: string) {
  const hash = sha256(new TextEncoder().encode(`global:${name}`));
  return Array.from(hash.slice(0, 8));
}
console.log("cancelEvent:", getDiscriminator("cancel_event"));
console.log("finishEvent:", getDiscriminator("finish_event"));
