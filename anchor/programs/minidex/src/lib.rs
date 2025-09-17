#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
pub mod state;
pub mod instructions;
pub mod errors;
pub mod constants;

use instructions::*;
use state::*;
use constants::*;

declare_id!("JAVuBXeBZqXNtS73azhBDAoYaaAFfo4gWXoZe2e7Jf8H");

#[program]
pub mod minidex {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>, fee_rate: u16) -> Result<()> {
        initialize(ctx, fee_rate)
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64, min_lp_tokens: u64) -> Result<()> {
        liquidity_add(ctx, amount_a, amount_b, min_lp_tokens)
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, lp_tokens: u64, min_amount_a: u64, min_amount_b: u64) -> Result<()> {
        liquidity_remove(ctx, lp_tokens, min_amount_a, min_amount_b)
    }

   
}

