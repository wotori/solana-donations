import { expect } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { FailedTransactionMetadata, LiteSVM } from "litesvm";
import * as path from "path";
import { fileURLToPath } from "url";
import BN from "bn.js";
import {
  coder,
  buildDonateIx,
  buildInitializeConfigIx,
  getConfigPda,
  getDonorIndexPda,
  getDonorPda,
  PROGRAM_ID,
} from "../sdk/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("solana-donations (litesvm)", () => {
  const svm = new LiteSVM().withSysvars().withBuiltins().withDefaultPrograms();

  const admin = Keypair.generate();

  const [configPda] = getConfigPda();
  const [donorPda] = getDonorPda(admin.publicKey);
  const [donorIndexPda] = getDonorIndexPda(new BN(1));

  const programSoPath = path.join(
    __dirname,
    "..",
    "target",
    "deploy",
    "solana_donations.so"
  );

  before(() => {
    svm.addProgramFromFile(PROGRAM_ID, programSoPath);
    svm.airdrop(admin.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
  });

  function send(tx: Transaction, signer: Keypair) {
    tx.recentBlockhash = svm.latestBlockhash();
    tx.feePayer = signer.publicKey;
    tx.sign(signer);
    const result = svm.sendTransaction(tx);
    if (result instanceof FailedTransactionMetadata) {
      throw new Error(`transaction failed: ${result.err().toString()}`);
    }
  }

  function decodeAccount<T>(accountName: string, pubkey: PublicKey): T {
    const acc = svm.getAccount(pubkey);
    if (!acc) {
      // eslint-disable-next-line no-console
      console.log(`missing account ${accountName}`, pubkey.toBase58(), "balance", svm.getBalance(pubkey)?.toString());
      throw new Error(`account ${accountName} missing at ${pubkey.toBase58()}`);
    }
    return coder.accounts.decode(accountName, Buffer.from(acc.data)) as T;
  }

  it("initializes config", () => {
    const ix = buildInitializeConfigIx(admin.publicKey, admin.publicKey);
    const tx = new Transaction().add(ix);
    send(tx, admin);

    const config = decodeAccount<any>("Config", configPda);
    expect(config.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(config.treasury.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(config.paused).to.equal(false);
    expect(Number(config.nextDonorId ?? config.next_donor_id)).to.equal(1);
  });

  it("accepts a donation and tracks donor + top10", () => {
    const donor = admin; // same wallet for simplicity
    const amount = new BN(1_000_000);

    const ix = buildDonateIx(amount, "tester", donor.publicKey, admin.publicKey, new BN(1));
    const tx = new Transaction().add(ix);
    send(tx, donor);

    const donorAcc = decodeAccount<any>("Donor", donorPda);
    expect(Number(donorAcc.donorId ?? donorAcc.donor_id)).to.equal(1);
    expect(Number(donorAcc.lifetimeAmount ?? donorAcc.lifetime_amount)).to.equal(amount.toNumber());
    expect(Number(donorAcc.donationsCount ?? donorAcc.donations_count)).to.equal(1);
    expect(donorAcc.nickname).to.equal("tester");

    const config = decodeAccount<any>("Config", configPda);
    expect(Number(config.totalDonated ?? config.total_donated)).to.equal(amount.toNumber());
    expect(Number(config.top10[0].donorId ?? config.top10[0].donor_id)).to.equal(1);
    expect(Number(config.top10[0].lifetimeAmount ?? config.top10[0].lifetime_amount)).to.equal(amount.toNumber());
  });
});
