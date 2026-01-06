import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { createRequire } from "module";
import type { SolanaDonations } from "../target/types/solana_donations";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const idlJson =
  // packaged path (sdk/dist/idl or sdk/idl)
  (() => {
    try {
      return require("../idl/solana_donations.json");
    } catch (_) {
      // fallback for local dev if prepare/build not run
      return require("../target/idl/solana_donations.json");
    }
  })();

const { BorshCoder } = anchor;
export type SolanaDonationsIdl = SolanaDonations;
export const IDL = idlJson as anchor.Idl;
export const PROGRAM_ID = new PublicKey((idlJson as any).address);

export const CONFIG_SEED = "config";
export const DONOR_SEED = "donor";
export const DONOR_INDEX_SEED = "donor_index";

export const coder = new BorshCoder(IDL);

export function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from(CONFIG_SEED)], PROGRAM_ID);
}

export function getDonorPda(donorWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(DONOR_SEED), donorWallet.toBuffer()],
    PROGRAM_ID
  );
}

export function getDonorIndexPda(donorId: BN | number | bigint): [PublicKey, number] {
  const idBn = BN.isBN(donorId) ? donorId : new BN(donorId.toString(), 10);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(DONOR_INDEX_SEED), idBn.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
}

export function buildInitializeConfigIx(treasury: PublicKey, admin: PublicKey): TransactionInstruction {
  const data = coder.instruction.encode("initialize_config", { treasury });
  const [configPda] = getConfigPda();
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildDonateIx(
  amount: BN,
  nickname: string | null,
  donorWallet: PublicKey,
  treasury: PublicKey,
  donorId?: BN | number | bigint
): TransactionInstruction {
  const data = coder.instruction.encode("donate", {
    amount,
    nickname: nickname ?? null,
  });
  const [configPda] = getConfigPda();
  const [donorPda] = getDonorPda(donorWallet);
  const id = donorId === undefined ? new BN(1) : BN.isBN(donorId) ? donorId : new BN(donorId.toString(), 10);
  const [donorIndexPda] = getDonorIndexPda(id);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: donorPda, isSigner: false, isWritable: true },
      { pubkey: donorIndexPda, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: donorWallet, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildUpdateProfileIx(
  donorWallet: PublicKey,
  nickname: string | null,
  description: string | null
): TransactionInstruction {
  const data = coder.instruction.encode("update_profile", {
    nickname: nickname ?? null,
    description: description ?? null,
  });
  const [donorPda] = getDonorPda(donorWallet);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: donorPda, isSigner: false, isWritable: true },
      { pubkey: donorWallet, isSigner: true, isWritable: false },
    ],
    data,
  });
}

export function buildSetTreasuryIx(admin: PublicKey, newTreasury: PublicKey): TransactionInstruction {
  const data = coder.instruction.encode("set_treasury", { new_treasury: newTreasury });
  const [configPda] = getConfigPda();
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
    ],
    data,
  });
}

export function buildSetPausedIx(admin: PublicKey, paused: boolean): TransactionInstruction {
  const data = coder.instruction.encode("set_paused", { paused });
  const [configPda] = getConfigPda();
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
    ],
    data,
  });
}

export function buildSetAdminIx(admin: PublicKey, newAdmin: PublicKey): TransactionInstruction {
  const data = coder.instruction.encode("set_admin", { new_admin: newAdmin });
  const [configPda] = getConfigPda();
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
    ],
    data,
  });
}

