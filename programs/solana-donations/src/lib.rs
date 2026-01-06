use anchor_lang::prelude::*;

pub mod constants;
pub mod contexts;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

pub use contexts::{AdminUpdate, Donate, InitializeConfig, UpdateProfile};
pub use contexts::*;

declare_id!("7XhmW42LmPuk2gcHjjsDwGiTurWDrUFP9yff9AK4mkB4");

#[program]
pub mod solana_donations {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, treasury: Pubkey) -> Result<()> {
        instructions::initialize_config::handler(ctx, treasury)
    }

    pub fn donate(ctx: Context<Donate>, amount: u64, nickname: Option<String>) -> Result<()> {
        instructions::donate::handler(ctx, amount, nickname)
    }

    pub fn update_profile(
        ctx: Context<UpdateProfile>,
        nickname: Option<String>,
        description: Option<String>,
    ) -> Result<()> {
        instructions::update_profile::handler(ctx, nickname, description)
    }

    pub fn set_treasury(ctx: Context<AdminUpdate>, new_treasury: Pubkey) -> Result<()> {
        instructions::set_treasury::handler(ctx, new_treasury)
    }

    pub fn set_paused(ctx: Context<AdminUpdate>, paused: bool) -> Result<()> {
        instructions::set_paused::handler(ctx, paused)
    }

    pub fn set_admin(ctx: Context<AdminUpdate>, new_admin: Pubkey) -> Result<()> {
        instructions::set_admin::handler(ctx, new_admin)
    }
}

