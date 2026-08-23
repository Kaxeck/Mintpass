import { generateSigner, publicKey, transactionBuilder } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createMint } from "@metaplex-foundation/mpl-toolbox";
import { CreateMetadataAccountV3InstructionAccounts, CreateMetadataAccountV3InstructionArgs, createMetadataAccountV3 } from "@metaplex-foundation/mpl-token-metadata";

const umi = createUmi("https://api.devnet.solana.com");
const mintSigner = generateSigner(umi);
const escrowState = publicKey("11111111111111111111111111111111");

const builder = createMint(umi, {
  mint: mintSigner,
  decimals: 0,
  mintAuthority: escrowState,
  freezeAuthority: escrowState,
}).add(createMetadataAccountV3(umi, {
  mint: mintSigner.publicKey,
  mintAuthority: escrowState,
  updateAuthority: umi.identity,
  data: {
    name: "Ticket",
    symbol: "TKT",
    uri: "http://test.com",
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
  },
  isMutable: true,
  collectionDetails: null
}));

console.log("Success! Builder has", builder.getInstructions().length, "instructions");
