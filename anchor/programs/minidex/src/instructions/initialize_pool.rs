use anchor_lang::prelude::*;
use anchor_spl::token::{Mint};
use crate::state::*;
use crate::errors::*;
use crate::constants::*;


pub fn initialize(
    ctx:Context<InitializePool>, 
    fee_rate: u16, 
    token_a_vault: Pubkey, 
    token_b_vault: Pubkey, 
    lp_mint: Pubkey
) -> Result<()> {

    require!(fee_rate <= MAX_FEE_RATE, MinidexError::InvalidFeeRate);
    require!(ctx.accounts.token_a_mint.key() != ctx.accounts.token_b_mint.key(), MinidexError::IdenticalMints);

    let pool = &mut ctx.accounts.pool;

    pool.authority = ctx.accounts.authority.key();
    pool.token_a_mint = ctx.accounts.token_a_mint.key();
    pool.token_b_mint = ctx.accounts.token_b_mint.key();
    pool.token_a_vault = token_a_vault;
    pool.token_b_vault = token_b_vault;
    pool.lp_mint = lp_mint;
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
        space = 8 + Pool::INIT_SPACE,
        payer = authority,
        seeds = [b"pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, Pool>,

    pub system_program: Program<'info, System>,

}