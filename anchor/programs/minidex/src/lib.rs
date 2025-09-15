#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("JAVuBXeBZqXNtS73azhBDAoYaaAFfo4gWXoZe2e7Jf8H");

#[program]
pub mod minidex {
    use super::*;

    pub fn close(_ctx: Context<CloseMinidex>) -> Result<()> {
        Ok(())
    }

    pub fn decrement(ctx: Context<Update>) -> Result<()> {
        ctx.accounts.minidex.count = ctx.accounts.minidex.count.checked_sub(1).unwrap();
        Ok(())
    }

    pub fn increment(ctx: Context<Update>) -> Result<()> {
        ctx.accounts.minidex.count = ctx.accounts.minidex.count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn initialize(_ctx: Context<InitializeMinidex>) -> Result<()> {
        Ok(())
    }

    pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
        ctx.accounts.minidex.count = value.clone();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMinidex<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
  init,
  space = 8 + Minidex::INIT_SPACE,
  payer = payer
    )]
    pub minidex: Account<'info, Minidex>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseMinidex<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
  mut,
  close = payer, // close account and return lamports to payer
    )]
    pub minidex: Account<'info, Minidex>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub minidex: Account<'info, Minidex>,
}

#[account]
#[derive(InitSpace)]
pub struct Minidex {
    count: u8,
}
