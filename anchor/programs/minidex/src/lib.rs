#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
pub mod state;
pub mod instructions;
pub mod errors;
pub mod constants;

use instructions::*;
use state::*;
use constants::*;

declare_id!("JAVuBXeBZqXNtS73azhBDAoYaaAFfo4gWXoZe2e7Jf8H");

#[program]
pub mod minidex {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>, fee_rate: u16) -> Result<()> {
        initialize(ctx, fee_rate)
    }

   
}

