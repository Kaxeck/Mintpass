import { createV1 } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey, generateSigner, createUmi } from "@metaplex-foundation/umi-bundle-defaults";

const umi = createUmi("https://api.devnet.solana.com");
const mintSigner = generateSigner(umi);

const params = {
  mint: mintSigner,
  name: "Test",
  uri: "http://test.com",
  sellerFeeBasisPoints: 0,
  authority: mintSigner,
};
createV1(umi, params as any);
console.log("Success");
