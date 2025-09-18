use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};
use crate::state::Pool;
use crate::utils::*;
use crate::errors::*;


pub fn token_swap(ctx:Context<Swap>, amount_in: u64, min_amount_out: u64, token_a_to_b: bool) -> Result<()> {

    require!(amount_in > 0, MinidexError::ZeroSwapAmount);

    let pool_account_info = ctx.accounts.pool.to_account_info();

    let pool = &mut ctx.accounts.pool;

    let token_a_mint = pool.token_a_mint;
    let token_b_mint = pool.token_b_mint;
    let bump = pool.bump;

    require!(pool.reserve_a > 0 && pool.reserve_b > 0, MinidexError::InsufficientLiquidity);

    let amount_out = calculate_swap_output(pool, amount_in, token_a_to_b)?;

    require!(amount_out >= min_amount_out, MinidexError::SlippageExceeded);

    let reserve_out = if token_a_to_b { pool.reserve_b } else { pool.reserve_a };

    require!(amount_out < reserve_out, MinidexError::InsufficientLiquidity);

    if token_a_to_b {
        require!(
            ctx.accounts.user_token_a_account.amount >= amount_in,
            MinidexError::InsufficientUserBalance
        )
    }
    else {
        require!(
            ctx.accounts.user_token_b_account.amount >= amount_in,
            MinidexError::InsufficientUserBalance
        )
    }

    let seeds = &[
        b"pool",
        token_a_mint.as_ref(),
        token_b_mint.as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    if token_a_to_b {
        // Transfer token A from user to vault
        let cpi_accounts_in = Transfer {
            from: ctx.accounts.user_token_a_account.to_account_info(),
            to: ctx.accounts.token_a_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_program_in = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_in = CpiContext::new(cpi_program_in, cpi_accounts_in);

        transfer(cpi_ctx_in, amount_in)?;

        // Transfer token B from vault to user
        let cpi_accounts_out = Transfer {
            from: ctx.accounts.token_b_vault.to_account_info(),
            to: ctx.accounts.user_token_b_account.to_account_info(),
            authority: pool_account_info.clone(),
        };

        let cpi_program_out = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_out = CpiContext::new_with_signer(cpi_program_out, cpi_accounts_out, signer);

        transfer(cpi_ctx_out, amount_out)?;

        // Update reserves
        pool.reserve_a = pool.reserve_a.checked_add(amount_in).unwrap();
        pool.reserve_b = pool.reserve_b.checked_sub(amount_out).unwrap();
    } else {
        // Transfer token B from user to vault
        let cpi_accounts_in = Transfer {
            from: ctx.accounts.user_token_b_account.to_account_info(),
            to: ctx.accounts.token_b_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_program_in = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_in = CpiContext::new(cpi_program_in, cpi_accounts_in);

        transfer(cpi_ctx_in, amount_in)?;

        // Transfer token A from vault to user
        let cpi_accounts_out = Transfer {
            from: ctx.accounts.token_a_vault.to_account_info(),
            to: ctx.accounts.user_token_a_account.to_account_info(),
            authority: pool_account_info.clone(),
        };
        let cpi_program_out = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_out = CpiContext::new_with_signer(cpi_program_out, cpi_accounts_out, signer);

        transfer(cpi_ctx_out, amount_out)?;

        // Update reserves
        pool.reserve_b = pool.reserve_b.checked_add(amount_in).unwrap();
        pool.reserve_a = pool.reserve_a.checked_sub(amount_out).unwrap();
    }

    Ok(())

}

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