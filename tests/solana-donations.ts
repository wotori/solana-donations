import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { FailedTransactionMetadata, LiteSVM } from "litesvm";
import { readFileSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import BN from "bn.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const idlPath = path.join(__dirname, "..", "target", "idl", "solana_donations.json");
const { BorshCoder } = anchor;
type Idl = anchor.Idl;

const idl = JSON.parse(readFileSync(idlPath, "utf-8")) as Idl;

const programId = new PublicKey((idl as any).address);
const coder = new BorshCoder(idl);

const CONFIG_SEED = Buffer.from("config");
const DONOR_SEED = Buffer.from("donor");
const DONOR_INDEX_SEED = Buffer.from("donor_index");

describe("solana-donations (litesvm)", () => {
  const svm = new LiteSVM().withSysvars().withBuiltins().withDefaultPrograms();

  const admin = Keypair.generate();

  const [configPda] = PublicKey.findProgramAddressSync(
    [CONFIG_SEED],
    programId
  );

  const [donorPda] = PublicKey.findProgramAddressSync(
    [DONOR_SEED, admin.publicKey.toBuffer()],
    programId
  );

  const [donorIndexPda] = PublicKey.findProgramAddressSync(
    [DONOR_INDEX_SEED, new BN(1).toArrayLike(Buffer, "le", 8)],
    programId
  );

  const programSoPath = path.join(
    __dirname,
    "..",
    "target",
    "deploy",
    "solana_donations.so"
  );

  before(() => {
    svm.addProgramFromFile(programId, programSoPath);
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
    const data = coder.instruction.encode("initialize_config", {
      treasury: admin.publicKey,
    });

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

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

    const data = coder.instruction.encode("donate", {
      amount,
      nickname: "tester",
    });

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: donorPda, isSigner: false, isWritable: true },
        { pubkey: donorIndexPda, isSigner: false, isWritable: true },
        { pubkey: admin.publicKey, isSigner: false, isWritable: true }, // treasury
        { pubkey: donor.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

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
