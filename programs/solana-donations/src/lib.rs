use anchor_lang::prelude::*;

declare_id!("7XhmW42LmPuk2gcHjjsDwGiTurWDrUFP9yff9AK4mkB4");

#[program]
pub mod solana_donations {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
