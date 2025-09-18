use anchor_lang::prelude::*;
use crate::state::*;

pub fn calculate_swap_output(pool: &Pool, amount: u64, token_a_to_b: bool) -> Result<u64> {
    // Implementation of swap output calculation
    let (reserve_in, reserve_out) = if token_a_to_b {
        (pool.reserve_a, pool.reserve_b)
    } else {
        (pool.reserve_b, pool.reserve_a)
    };

    let fee_adjusted_amount_in = (amount as u128)
        .checked_mul(10000u128.checked_sub(pool.fee_rate as u128).unwrap())
        .unwrap()
        .checked_div(10000)
        .unwrap();


    let numerator = fee_adjusted_amount_in
        .checked_mul(reserve_out as u128)
        .unwrap();
    
    let denominator = (reserve_in as u128)
        .checked_add(fee_adjusted_amount_in)
        .unwrap();

    let amount_out = numerator.checked_div(denominator).unwrap() as u64;
    
    Ok(amount_out)
}

