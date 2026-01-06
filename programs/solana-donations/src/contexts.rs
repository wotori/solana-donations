use anchor_lang::prelude::*;

use crate::state::{Config, Donor};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = Config::space(),
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(
        init_if_needed,
        payer = donor_wallet,
        space = Donor::space(),
        seeds = [b"donor", donor_wallet.key().as_ref()],
        bump
    )]
    pub donor: Account<'info, Donor>,
    /// CHECK: PDA derived and created in handler, verified there.
    #[account(mut)]
    pub donor_index: UncheckedAccount<'info>,
    /// CHECK: Treasury destination for SOL transfers.
    #[account(mut, address = config.treasury)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut)]
    pub donor_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [b"donor", donor_wallet.key().as_ref()],
        bump,
    )]
    pub donor: Account<'info, Donor>,
    pub donor_wallet: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminUpdate<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut, address = config.admin)]
    pub admin: Signer<'info>,
}

