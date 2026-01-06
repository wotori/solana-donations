import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { SolanaDonations } from "../target/types/solana_donations";

describe("solana-donations", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solanaDonations as Program<SolanaDonations>;
  const admin = provider.wallet.publicKey;

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const [donorPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("donor"), admin.toBuffer()],
    program.programId
  );

  const [donorIndexPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("donor_index"), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  it("initializes config", async () => {
    await program.methods
      .initializeConfig(admin)
      .accounts({
        admin,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.config.fetch(configPda);
    expect(config.admin.toBase58()).to.equal(admin.toBase58());
    expect(config.treasury.toBase58()).to.equal(admin.toBase58());
    expect(config.paused).to.equal(false);
    expect(config.nextDonorId.toNumber()).to.equal(1);
  });

  it("accepts a donation and tracks donor + top10", async () => {
    const amount = new anchor.BN(1_000_000);
    await program.methods
      .donate(amount, "tester")
      .accounts({
        config: configPda,
        donor: donorPda,
        donorIndex: donorIndexPda,
        treasury: admin,
        donorWallet: admin,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const donor = await program.account.donor.fetch(donorPda);
    expect(donor.donorId.toNumber()).to.equal(1);
    expect(donor.lifetimeAmount.toNumber()).to.equal(amount.toNumber());
    expect(donor.donationsCount.toNumber()).to.equal(1);
    expect(donor.nickname).to.equal("tester");

    const config = await program.account.config.fetch(configPda);
    expect(config.totalDonated.toNumber()).to.equal(amount.toNumber());
    expect(config.top10[0].donorId.toNumber()).to.equal(1);
    expect(config.top10[0].lifetimeAmount.toNumber()).to.equal(amount.toNumber());
  });
});
