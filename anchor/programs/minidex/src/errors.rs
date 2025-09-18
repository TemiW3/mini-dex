use anchor_lang::prelude::*;

#[error_code]
pub enum MinidexError {
    #[msg("Invalid fee rate")]
    InvalidFeeRate,
    #[msg("Identical token mints")]
    IdenticalMints,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Math operation resulted in overflow")]
    MathOverflow,
    #[msg("Insufficient liquidity provided")]
    InsufficientLiquidity,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("LP token amount must be greater than zero")]
    ZeroLPTokens,
    #[msg("Pool is empty")]
    EmptyPool,
    #[msg("Insufficient LP tokens")]
    InsufficientLPTokens,
    #[msg("Insufficient source tokens")]
    InsufficientSourceTokens,
    #[msg("Zero swap amount")]
    ZeroSwapAmount,
    #[msg("Insufficient user balance")]
    InsufficientUserBalance,
}