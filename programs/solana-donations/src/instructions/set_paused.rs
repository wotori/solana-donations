use anchor_lang::prelude::*;

use crate::contexts::AdminUpdate;

pub fn handler(ctx: Context<AdminUpdate>, paused: bool) -> Result<()> {
    ctx.accounts.config.paused = paused;
    Ok(())
}

