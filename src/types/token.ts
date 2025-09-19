export interface Token {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  balance?: number;
}

export interface PoolInfo {
  authority: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenAVault: string;
  tokenBVault: string;
  lpMint: string;
  feeRate: number;
  reserveA: number;
  reserveB: number;
  totalLpSupply: number;
  bump: number;
}

export interface SwapResult {
  outputAmount: number;
  priceImpact: number;
  fee: number;
}