use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;


pub fn initialize(ctx:Context<InitializePool>, fee_rate: u16) -> Result<()> {

    require!(fee_rate <= MAX_FEE_RATE, MinidexError::InvalidFeeRate);
    require!(ctx.accounts.token_a_mint.key() != ctx.accounts.token_b_mint.key(), MinidexError::IdenticalMints);

    let pool = &mut ctx.accounts.pool;

    pool.authority = ctx.accounts.authority.key();
    pool.token_a_mint = ctx.accounts.token_a_mint.key();
    pool.token_b_mint = ctx.accounts.token_b_mint.key();
    pool.token_a_vault = ctx.accounts.token_a_vault.key();
    pool.token_b_vault = ctx.accounts.token_b_vault.key();
    pool.lp_mint = ctx.accounts.lp_mint.key();
    pool.fee_rate = fee_rate;
    pool.bump = ctx.bumps.pool;
    pool.reserve_a = 0;
    pool.reserve_b = 0;
    pool.total_lp_supply = 0;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_a_mint: Account<'info, Mint>,

    pub token_b_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = token_a_mint,
        token::authority = pool,
    )]
    pub token_a_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        token::mint = token_b_mint,
        token::authority = pool,
    )]
    pub token_b_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        space = 8 + Pool::INIT_SPACE,
        payer = authority,
        seeds = [b"pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = pool,
    )]
    pub lp_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}