#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
pub mod state;
pub mod instructions;
pub mod errors;
pub mod constants;
pub mod utils;

use instructions::*;
use state::*;

declare_id!("JAVuBXeBZqXNtS73azhBDAoYaaAFfo4gWXoZe2e7Jf8H");

#[program]
pub mod minidex {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>, fee_rate: u16, token_a_vault: Pubkey, token_b_vault: Pubkey, lp_mint: Pubkey) -> Result<()> {
        initialize(ctx, fee_rate, token_a_vault, token_b_vault, lp_mint)
    }
    pub fn initialize_vault_a(ctx: Context<SetupVaultA>) -> Result<()> {
        initialize_a(ctx)
    }
    pub fn initialize_vault_b(ctx: Context<SetupVaultB>) -> Result<()> {
        initialize_b(ctx)
    }
    pub fn initialize_lp_mint(ctx: Context<SetupLpMint>) -> Result<()> {
        initialize_lp(ctx)
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64, min_lp_tokens: u64) -> Result<()> {
        liquidity_add(ctx, amount_a, amount_b, min_lp_tokens)
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, lp_tokens: u64, min_amount_a: u64, min_amount_b: u64) -> Result<()> {
        liquidity_remove(ctx, lp_tokens, min_amount_a, min_amount_b)
    }

    pub fn swap_tokens(ctx: Context<Swap>, amount_in: u64, min_amount_out: u64, token_a_to_b: bool) -> Result<()> {
        token_swap(ctx, amount_in, min_amount_out, token_a_to_b)
    }

   
}

