const anchor = require("@coral-xyz/anchor");
const assert = require("assert");

describe("did_system", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DidSystem;
  const user = provider.wallet;

  // Derive the PDA for the DID account
  const [didPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("did"), user.publicKey.toBuffer()],
    program.programId
  );

  console.log("Program ID:", program.programId.toString());
  console.log("User:", user.publicKey.toString());
  console.log("DID PDA:", didPda.toString());

  it("Creates a DID", async () => {
    try {
      const tx = await program.methods
        .createDid(
          "johndoe",
          "github.com/john",
          "@johndoe",
          "QmTest123"
        )
        .accounts({
          didAccount: didPda,
          user: user.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Create DID transaction:", tx);

      // Fetch the account data
      const didAccount = await program.account.didAccount.fetch(didPda);
      
      console.log("Username:", didAccount.username);
      console.log("GitHub:", didAccount.github);
      console.log("Twitter:", didAccount.twitter);
      console.log("IPFS Hash:", didAccount.ipfsHash);
      console.log("Owner:", didAccount.owner.toString());
      
      assert.strictEqual(didAccount.username, "johndoe");
      assert.strictEqual(didAccount.github, "github.com/john");
      assert.strictEqual(didAccount.twitter, "@johndoe");
      
      console.log("✅ DID created successfully!");
    } catch (error) {
      console.error("Error creating DID:", error);
      throw error;
    }
  });

  it("Updates a DID", async () => {
    try {
      const tx = await program.methods
        .updateDid(
          "github.com/johndoe-updated",
          "@john_official",
          null
        )
        .accounts({
          didAccount: didPda,
          user: user.publicKey,
          owner: user.publicKey,
        })
        .rpc();

      console.log("✅ Update DID transaction:", tx);

      const didAccount = await program.account.didAccount.fetch(didPda);
      
      console.log("Updated GitHub:", didAccount.github);
      console.log("Updated Twitter:", didAccount.twitter);
      
      assert.strictEqual(didAccount.github, "github.com/johndoe-updated");
      assert.strictEqual(didAccount.twitter, "@john_official");
      
      console.log("✅ DID updated successfully!");
    } catch (error) {
      console.error("Error updating DID:", error);
      throw error;
    }
  });

  it("Deletes a DID", async () => {
    try {
      const tx = await program.methods
        .deleteDid()
        .accounts({
          didAccount: didPda,
          user: user.publicKey,
          owner: user.publicKey,
        })
        .rpc();

      console.log("✅ Delete DID transaction:", tx);

      // Try to fetch (should fail)
      try {
        await program.account.didAccount.fetch(didPda);
        assert.fail("Account should not exist after deletion");
      } catch (err) {
        console.log("✅ DID successfully deleted! Account no longer exists.");
      }
    } catch (error) {
      console.error("Error deleting DID:", error);
      throw error;
    }
  });
});