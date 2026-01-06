use anchor_lang::prelude::*;

use crate::constants::{MAX_DESCRIPTION_LEN, MAX_NICKNAME_LEN, TOP_SIZE};

#[account]
#[derive(Default)]
pub struct Config {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub paused: bool,
    pub next_donor_id: u64,
    pub total_donated: u64,
    pub top10: [TopEntry; TOP_SIZE],
}

impl Config {
    pub const fn space() -> usize {
        8  // discriminator
        + 32 // admin
        + 32 // treasury
        + 1  // paused
        + 8  // next_donor_id
        + 8  // total_donated
        + TopEntry::space() * TOP_SIZE
    }
}

#[account]
#[derive(Default)]
pub struct Donor {
    pub donor_wallet: Pubkey,
    pub donor_id: u64,
    pub lifetime_amount: u64,
    pub donations_count: u64,
    pub nickname: String,
    pub description: String,
    pub last_donation_ts: i64,
}

impl Donor {
    pub const fn space() -> usize {
        8  // discriminator
        + 32 // donor_wallet
        + 8  // donor_id
        + 8  // lifetime_amount
        + 8  // donations_count
        + 4 + MAX_NICKNAME_LEN // nickname string prefix + data
        + 4 + MAX_DESCRIPTION_LEN // description string prefix + data
        + 8  // last_donation_ts
    }
}

#[account]
#[derive(Default)]
pub struct DonorIndex {
    pub donor_id: u64,
    pub donor_wallet: Pubkey,
    pub donor_pda: Pubkey,
}

impl DonorIndex {
    pub const fn space() -> usize {
        8  // discriminator
        + 8  // donor_id
        + 32 // donor_wallet
        + 32 // donor_pda
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Default, Debug, PartialEq, Eq)]
pub struct TopEntry {
    pub donor_id: u64,
    pub donor_wallet: Pubkey,
    pub donor_pda: Pubkey,
    pub lifetime_amount: u64,
}

impl TopEntry {
    pub const fn space() -> usize {
        8  // donor_id
        + 32 // donor_wallet
        + 32 // donor_pda
        + 8  // lifetime_amount
    }
}

