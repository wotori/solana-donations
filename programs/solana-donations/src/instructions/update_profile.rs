use anchor_lang::prelude::*;

use crate::{
    contexts::UpdateProfile,
    errors::ErrorCode,
    events::ProfileUpdatedEvent,
    utils::validate_str_len,
};

pub fn handler(
    ctx: Context<UpdateProfile>,
    nickname: Option<String>,
    description: Option<String>,
) -> Result<()> {
    let donor = &mut ctx.accounts.donor;
    require_keys_eq!(donor.donor_wallet, ctx.accounts.donor_wallet.key(), ErrorCode::Unauthorized);

    if let Some(name) = nickname {
        validate_str_len(&name, crate::constants::MAX_NICKNAME_LEN, ErrorCode::NicknameTooLong)?;
        donor.nickname = name;
    }

    if let Some(desc) = description {
        validate_str_len(&desc, crate::constants::MAX_DESCRIPTION_LEN, ErrorCode::DescriptionTooLong)?;
        donor.description = desc;
    }

    emit!(ProfileUpdatedEvent {
        donor_wallet: donor.donor_wallet,
        donor_id: donor.donor_id,
        donor_pda: donor.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

