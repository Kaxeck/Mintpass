import { generateSigner, publicKey, transactionBuilder } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createMint, setAuthority } from "@metaplex-foundation/mpl-toolbox";
import { createMetadataAccountV3 } from "@metaplex-foundation/mpl-token-metadata";
import { AuthorityType } from "@metaplex-foundation/mpl-toolbox";

const umi = createUmi("https://api.devnet.solana.com");
const mintSigner = generateSigner(umi);
const escrowState = publicKey("11111111111111111111111111111111");

const builder = transactionBuilder()
  .add(createMint(umi, {
    mint: mintSigner,
    decimals: 0,
    mintAuthority: umi.identity.publicKey,
    freezeAuthority: umi.identity.publicKey,
  }))
  .add(createMetadataAccountV3(umi, {
    mint: mintSigner.publicKey,
    mintAuthority: umi.identity,
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
  }))
  .add(setAuthority(umi, {
    owned: mintSigner.publicKey,
    owner: umi.identity,
    authorityType: AuthorityType.MintTokens,
    newAuthority: escrowState
  }))
  .add(setAuthority(umi, {
    owned: mintSigner.publicKey,
    owner: umi.identity,
    authorityType: AuthorityType.FreezeAccount,
    newAuthority: escrowState
  }));

console.log("Success! Builder has", builder.getInstructions().length, "instructions");
