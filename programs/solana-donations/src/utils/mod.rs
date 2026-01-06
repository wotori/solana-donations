use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::invoke_signed,
    system_instruction,
};

use crate::{
    constants::{MAX_NICKNAME_LEN, TOP_SIZE},
    errors::ErrorCode,
    state::{DonorIndex, TopEntry},
};

pub fn validate_nickname(nickname: &Option<String>) -> Result<()> {
    if let Some(name) = nickname {
        validate_str_len(name, MAX_NICKNAME_LEN, ErrorCode::NicknameTooLong)?;
    }
    Ok(())
}

pub fn validate_str_len(value: &str, max: usize, err: ErrorCode) -> Result<()> {
    if value.as_bytes().len() > max {
        return Err(err.into());
    }
    Ok(())
}

pub fn create_or_check_donor_index<'info>(
    donor_index_info: AccountInfo<'info>,
    payer: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    program_id: &Pubkey,
    donor_id: u64,
    donor_wallet: Pubkey,
    donor_pda: Pubkey,
) -> Result<()> {
    let (expected_key, bump) =
        Pubkey::find_program_address(&[b"donor_index", &donor_id.to_le_bytes()], program_id);
    require_keys_eq!(expected_key, donor_index_info.key(), ErrorCode::InvalidDonorIndex);

    if donor_index_info.data_is_empty() {
        let lamports = Rent::get()?.minimum_balance(DonorIndex::space());
        let create_ix = system_instruction::create_account(
            payer.key,
            donor_index_info.key,
            lamports,
            DonorIndex::space() as u64,
            program_id,
        );
        invoke_signed(
            &create_ix,
            &[payer.clone(), donor_index_info.clone(), system_program.clone()],
            &[&[b"donor_index", &donor_id.to_le_bytes(), &[bump]]],
        )?;

        DonorIndex {
            donor_id,
            donor_wallet,
            donor_pda,
        }
        .try_serialize(&mut *donor_index_info.try_borrow_mut_data()?)?;
    } else {
        require_keys_eq!(
            *donor_index_info.owner,
            *program_id,
            ErrorCode::InvalidDonorIndexOwner
        );

        let data = donor_index_info.try_borrow_data()?;
        let mut data_slice: &[u8] = &data;
        let mut donor_index: DonorIndex = DonorIndex::try_deserialize(&mut data_slice)?;

        require!(
            donor_index.donor_id == donor_id
                && donor_index.donor_wallet == donor_wallet
                && donor_index.donor_pda == donor_pda,
            ErrorCode::InvalidDonorIndex
        );

        // Ensure donor_index stays in sync if it was empty/default but owned by the program.
        if donor_index.donor_id == 0 {
            donor_index.donor_id = donor_id;
            donor_index.donor_wallet = donor_wallet;
            donor_index.donor_pda = donor_pda;
            donor_index.try_serialize(&mut *donor_index_info.try_borrow_mut_data()?)?;
        }
    }

    Ok(())
}

pub fn update_top10(top: &mut [TopEntry; TOP_SIZE], candidate: TopEntry) {
    if let Some(pos) = top.iter().position(|e| e.donor_id == candidate.donor_id) {
        top[pos] = candidate;
    } else {
        let (min_idx, min_val) = top
            .iter()
            .enumerate()
            .min_by(|(_, a), (_, b)| a.lifetime_amount.cmp(&b.lifetime_amount))
            .unwrap();

        if candidate.lifetime_amount > min_val.lifetime_amount
            || (candidate.lifetime_amount == min_val.lifetime_amount
                && (min_val.donor_id == 0 || candidate.donor_id < min_val.donor_id))
        {
            top[min_idx] = candidate;
        }
    }

    top.sort_by(|a, b| match b.lifetime_amount.cmp(&a.lifetime_amount) {
        core::cmp::Ordering::Equal => a.donor_id.cmp(&b.donor_id),
        other => other,
    });
}

