use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Donations are paused")]
    Paused,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Nickname exceeds maximum length")]
    NicknameTooLong,
    #[msg("Description exceeds maximum length")]
    DescriptionTooLong,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid donor index account")]
    InvalidDonorIndex,
    #[msg("Donor index must be owned by this program")]
    InvalidDonorIndexOwner,
}

