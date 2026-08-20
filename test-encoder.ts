import { getAddressEncoder, address } from "@solana/addresses";

const encoder = getAddressEncoder();
const addr = address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const encoded = encoder.encode(addr);
console.log("Encoded length:", encoded.length);
