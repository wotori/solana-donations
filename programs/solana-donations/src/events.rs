use anchor_lang::prelude::*;

#[event]
pub struct DonationEvent {
    pub donor_wallet: Pubkey,
    pub donor_id: u64,
    pub donor_pda: Pubkey,
    pub amount_lamports: u64,
    pub lifetime_amount_after: u64,
    pub treasury: Pubkey,
    pub timestamp: i64,
    pub created_new: bool,
}

#[event]
pub struct ProfileUpdatedEvent {
    pub donor_wallet: Pubkey,
    pub donor_id: u64,
    pub donor_pda: Pubkey,
    pub timestamp: i64,
}

