use anchor_lang::prelude::*;

use crate::{
    contexts::Donate,
    errors::ErrorCode,
    events::DonationEvent,
    state::TopEntry,
    utils::{create_or_check_donor_index, update_top10, validate_nickname},
};

pub fn handler(ctx: Context<Donate>, amount: u64, nickname: Option<String>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    require!(!config.paused, ErrorCode::Paused);
    require!(amount > 0, ErrorCode::InvalidAmount);

    let donor_wallet = &ctx.accounts.donor_wallet;
    let donor = &mut ctx.accounts.donor;

    let mut created_new = false;
    if donor.donor_id == 0 {
        created_new = true;
        donor.donor_wallet = donor_wallet.key();
        donor.donor_id = config.next_donor_id;
        donor.lifetime_amount = 0;
        donor.donations_count = 0;
        donor.nickname = String::new();
        donor.description = String::new();
        donor.last_donation_ts = 0;
        config.next_donor_id = config
            .next_donor_id
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
    } else {
        require_keys_eq!(donor.donor_wallet, donor_wallet.key(), ErrorCode::Unauthorized);
    }

    validate_nickname(&nickname)?;

    let now = Clock::get()?.unix_timestamp;

    // Transfer SOL to the treasury.
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: donor_wallet.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        amount,
    )?;

    donor.lifetime_amount = donor
        .lifetime_amount
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;
    donor.donations_count = donor
        .donations_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    donor.last_donation_ts = now;

    if let Some(name) = nickname {
        if !name.is_empty() {
            donor.nickname = name;
        }
    }

    config.total_donated = config
        .total_donated
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;

    // Ensure donor index account exists and is correct.
    let donor_id = donor.donor_id;
    create_or_check_donor_index(
        ctx.accounts.donor_index.to_account_info(),
        donor_wallet.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.program_id,
        donor_id,
        donor_wallet.key(),
        donor.key(),
    )?;

    // Update top10 in-place.
    update_top10(&mut config.top10, TopEntry {
        donor_id,
        donor_wallet: donor.donor_wallet,
        donor_pda: donor.key(),
        lifetime_amount: donor.lifetime_amount,
    });

    emit!(DonationEvent {
        donor_wallet: donor_wallet.key(),
        donor_id,
        donor_pda: donor.key(),
        amount_lamports: amount,
        lifetime_amount_after: donor.lifetime_amount,
        treasury: ctx.accounts.treasury.key(),
        timestamp: now,
        created_new,
    });

    Ok(())
}

