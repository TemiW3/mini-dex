use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::Pool;

#[derive(Accounts)]
pub struct SetupVaultB<'info> {
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

    /// Token B mint
    pub token_b_mint: Account<'info, Mint>,

    /// Token B vault PDA
    #[account(
        init,
        seeds = [b"vault_b", pool.key().as_ref()],
        bump,
        payer = authority,
        token::mint = token_b_mint,
        token::authority = pool
    )]
    pub token_b_vault: Account<'info, TokenAccount>,

    /// Token program
    pub token_program: Program<'info, Token>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn initialize_vault_b(ctx: Context<SetupVaultB>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    
    pool.token_b_vault = ctx.accounts.token_b_vault.key();

    Ok(())
}
