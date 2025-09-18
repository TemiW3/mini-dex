use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::Pool;

#[derive(Accounts)]
pub struct SetupLpMint<'info> {
    /// Pool authority
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Pool account
    #[account(
        mut,
        seeds = [b"pool", pool.token_a_mint.as_ref(), pool.token_b_mint.as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    /// LP token mint PDA
    #[account(
        init,
        seeds = [b"lp_mint", pool.key().as_ref()],
        bump,
        payer = authority,
        mint::decimals = 6,
        mint::authority = pool
    )]
    pub lp_mint: Account<'info, Mint>,

    /// Token program
    pub token_program: Program<'info, Token>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn initialize_lp_mint(ctx: Context<SetupLpMint>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    
    pool.lp_mint = ctx.accounts.lp_mint.key();

    Ok(())
}
