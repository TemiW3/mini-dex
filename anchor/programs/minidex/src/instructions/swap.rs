use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Burn, burn, Transfer, transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::Pool;
use crate::errors::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool", pool.token_a_mint.as_ref(), pool.token_b_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        token::mint = pool.token_a_mint,
        token::authority = user,
    )]
    pub user_token_a_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = pool.token_b_mint,
        token::authority = user,
    )]
    pub user_token_b_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = pool.token_a_vault
    )]
    pub token_a_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = pool.token_b_vault
    )]
    pub token_b_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}