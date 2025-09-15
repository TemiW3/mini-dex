use anchor_lang::prelude::*;

#[error_code]
pub enum MinidexError {
    #[msg("Invalid fee rate")]
    InvalidFeeRate,
    #[msg("Identical token mints")]
    IdenticalMints,
}