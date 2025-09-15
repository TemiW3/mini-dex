use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub authority: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub token_a_vault: Pubkey,
    pub token_b_vault: Pubkey,
    pub lp_mint: Pubkey,
    pub fee_rate: u16,
    pub bump: u8,
    pub reserve_a: u64,
    pub reserve_b: u64,
    pub total_lp_supply: u64,
}





