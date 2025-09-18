use anchor_lang::prelude::*;

use anchor_spl::token::{Mint, Token, TokenAccount, Transfer, transfer, mint_to};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::*;
use crate::errors::*;
use crate::constants::*;

pub fn liquidity_add(ctx: Context<AddLiquidity>, amount_a: u64, amount_b: u64, min_lp_tokens: u64) -> Result<()> {

    require!(amount_a > 0 && amount_b > 0, MinidexError::ZeroAmount);

    let pool_account_info = ctx.accounts.pool.to_account_info();

    let pool = &mut ctx.accounts.pool;

    let token_a_mint = pool.token_a_mint;
    let token_b_mint = pool.token_b_mint;
    let bump = pool.bump;

    let lp_tokens = if pool.total_lp_supply == 0 {
        let lp_amount = ((amount_a as u128)
            .checked_mul(amount_b as u128)
            .ok_or(MinidexError::MathOverflow)?)
            .integer_sqrt() as u64;

        lp_amount
        .checked_sub(MINIMUM_LIQUIDITY)
        .ok_or(MinidexError::InsufficientLiquidity)?
    } 
    else {
        let lp_from_a = (amount_a as u128)
            .checked_mul(pool.total_lp_supply as u128)
            .ok_or(MinidexError::MathOverflow)?
            .checked_div(pool.reserve_a as u128)
            .ok_or(MinidexError::MathOverflow)? as u64;

        let lp_from_b = (amount_b as u128)
            .checked_mul(pool.total_lp_supply as u128)
            .ok_or(MinidexError::MathOverflow)?
            .checked_div(pool.reserve_b as u128)
            .ok_or(MinidexError::MathOverflow)? as u64;

        std::cmp::min(lp_from_a, lp_from_b)

    };
    require!(lp_tokens >= min_lp_tokens, MinidexError::SlippageExceeded);
    require!(lp_tokens > 0, MinidexError::ZeroLPTokens);

    let cpi_accounts_a = Transfer {
        from: ctx.accounts.user_token_a_account.to_account_info(),
        to: ctx.accounts.token_a_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_a),
        amount_a,
    )?;

    let cpi_accounts_b = Transfer {
        from: ctx.accounts.user_token_b_account.to_account_info(),
        to: ctx.accounts.token_b_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts_b),
        amount_b,
    )?;

    let seeds = &[
        b"pool",
        token_a_mint.as_ref(),
        token_b_mint.as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts_lp = anchor_spl::token::MintTo {
        mint: ctx.accounts.lp_mint.to_account_info(),
        to: ctx.accounts.user_lp_account.to_account_info(),
        authority: pool_account_info.clone(),
    };

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_lp,
            signer,
        ),
        lp_tokens,
    )?;

    pool.reserve_a = pool.reserve_a.checked_add(amount_a).ok_or(MinidexError::MathOverflow)?;
    pool.reserve_b = pool.reserve_b.checked_add(amount_b).ok_or(MinidexError::MathOverflow)?;

    let total_lp_increase = if pool.total_lp_supply == 0 {
        lp_tokens.checked_add(MINIMUM_LIQUIDITY).ok_or(MinidexError::MathOverflow)?
    } else {
        lp_tokens
    };

    pool.total_lp_supply = pool.total_lp_supply.checked_add(total_lp_increase).ok_or(MinidexError::MathOverflow)?;


    Ok(())
}


trait IntegerSqrt {
    fn integer_sqrt(self) -> Self;
}

impl IntegerSqrt for u128 {
    fn integer_sqrt(self) -> Self {
        if self < 2 {
            return self;
        }
        
        let mut x = self;
        let mut y = (self + 1) / 2;
        
        while y < x {
            x = y;
            y = (y + self / y) / 2;
        }
        
        x
    }
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
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
        init_if_needed,
        payer = user,
        associated_token::mint = lp_mint,
        associated_token::authority = user,
    )]
    pub user_lp_account: Account<'info, TokenAccount>,

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
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,

}