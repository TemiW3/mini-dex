use anchor_lang::prelude::*;

use anchor_spl::token::{Mint, Token, TokenAccount, Burn, burn, Transfer, transfer};
use crate::state::Pool;
use crate::errors::*;

pub fn liquidity_remove(ctx: Context<RemoveLiquidity>, lp_tokens: u64, min_amount_a: u64, min_amount_b: u64) -> Result<()> {

    require!(lp_tokens > 0, MinidexError::ZeroLPTokens);

    let pool_account_info = ctx.accounts.pool.to_account_info();

    let pool = &mut ctx.accounts.pool;

    let token_a_mint = pool.token_a_mint;
    let token_b_mint = pool.token_b_mint;
    let bump = pool.bump;

    require!(pool.total_lp_supply > 0, MinidexError::EmptyPool);
    require!(pool.reserve_a > 0 && pool.reserve_b > 0, MinidexError::InsufficientLiquidity);
    require!(ctx.accounts.user_lp_token.amount >= lp_tokens, MinidexError::InsufficientLPTokens);

    let amount_a = (lp_tokens as u128)
        .checked_mul(pool.reserve_a as u128)
        .ok_or(MinidexError::MathOverflow)?
        .checked_div(pool.total_lp_supply as u128)
        .ok_or(MinidexError::MathOverflow)? as u64;

    let amount_b = (lp_tokens as u128)
        .checked_mul(pool.reserve_b as u128)
        .ok_or(MinidexError::MathOverflow)?
        .checked_div(pool.total_lp_supply as u128)
        .ok_or(MinidexError::MathOverflow)? as u64;

    require!(amount_a >= min_amount_a, MinidexError::SlippageExceeded);
    require!(amount_b >= min_amount_b, MinidexError::SlippageExceeded);

    require!(amount_a <= pool.reserve_a, MinidexError::InsufficientLiquidity);
    require!(amount_b <= pool.reserve_b, MinidexError::InsufficientLiquidity);

    let cpi_accounts = Burn {
        mint: ctx.accounts.lp_mint.to_account_info(),
        from: ctx.accounts.user_lp_token.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    burn(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        lp_tokens,
    )?;

    let seeds = &[
        b"pool",
        token_a_mint.as_ref(),
        token_b_mint.as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts_a = Transfer {
        from: ctx.accounts.token_a_vault.to_account_info(),
        to: ctx.accounts.user_token_a_account.to_account_info(),
        authority: pool_account_info.clone(),
    };

    let cpi_accounts_b = Transfer {
        from: ctx.accounts.token_b_vault.to_account_info(),
        to: ctx.accounts.user_token_b_account.to_account_info(),
        authority: pool_account_info.clone(),
    };

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_a,
            signer,
        ),
        amount_a,
    )?;

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_b,
            signer,
        ),
        amount_b,
    )?;

    pool.reserve_a = pool.reserve_a.checked_sub(amount_a).ok_or(MinidexError::MathOverflow)?;
    pool.reserve_b = pool.reserve_b.checked_sub(amount_b).ok_or(MinidexError::MathOverflow)?;
    pool.total_lp_supply = pool.total_lp_supply.checked_sub(lp_tokens).ok_or(MinidexError::MathOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
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
        token::mint = pool.lp_mint,
        token::authority = user
    )]
    pub user_lp_token: Account<'info, TokenAccount>,

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

    #[account(
        mut,
        address = pool.lp_mint
    )]
    pub lp_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}