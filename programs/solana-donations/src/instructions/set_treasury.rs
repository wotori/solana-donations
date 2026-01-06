use anchor_lang::prelude::*;

use crate::contexts::AdminUpdate;

pub fn handler(ctx: Context<AdminUpdate>, new_treasury: Pubkey) -> Result<()> {
    ctx.accounts.config.treasury = new_treasury;
    Ok(())
}

