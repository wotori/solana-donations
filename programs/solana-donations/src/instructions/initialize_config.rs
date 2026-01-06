use anchor_lang::prelude::*;

use crate::contexts::InitializeConfig;

pub fn handler(ctx: Context<InitializeConfig>, treasury: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.treasury = treasury;
    config.paused = false;
    config.next_donor_id = 1;
    config.total_donated = 0;
    config.top10 = [Default::default(); crate::constants::TOP_SIZE];
    Ok(())
}

