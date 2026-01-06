use anchor_lang::prelude::*;

use crate::contexts::AdminUpdate;

pub fn handler(ctx: Context<AdminUpdate>, new_admin: Pubkey) -> Result<()> {
    ctx.accounts.config.admin = new_admin;
    Ok(())
}

