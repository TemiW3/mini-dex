import { useState, useEffect } from 'react'
import { PoolRatio } from './usePoolData'

export const useLpCalculations = (
  amountA: string,
  amountB: string,
  tokenA: { mint: string; decimals: number },
  tokenB: { mint: string; decimals: number },
  poolRatio: PoolRatio | null,
  getPoolInfo: (tokenAMint: string, tokenBMint: string) => Promise<any>,
) => {
  const [calculatedLpTokens, setCalculatedLpTokens] = useState<number>(0)
  const [ratioError, setRatioError] = useState<string>('')

  // Function to auto-calculate Token B amount based on Token A amount and pool ratio
  const calculateTokenBAmount = (amountA: number) => {
    if (!poolRatio || amountA <= 0) {
      return 0
    }
    return amountA * poolRatio.ratio
  }

  // Function to calculate LP tokens based on backend logic
  const calculateLpTokens = async (amountA: number, amountB: number) => {
    if (amountA <= 0 || amountB <= 0) {
      setCalculatedLpTokens(0)
      return { lpTokens: 0 }
    }

    try {
      const poolInfo = await getPoolInfo(tokenA.mint, tokenB.mint)
      if (!poolInfo) {
        setCalculatedLpTokens(0)
        return { lpTokens: 0 }
      }

      const MINIMUM_LIQUIDITY = 1000
      const amountAWithDecimals = amountA * Math.pow(10, tokenA.decimals)
      const amountBWithDecimals = amountB * Math.pow(10, tokenB.decimals)

      let lpTokens: number

      if (poolInfo.totalLpSupply === 0) {
        // New pool: LP = sqrt(amount_a * amount_b) - MINIMUM_LIQUIDITY
        const sqrtProduct = Math.sqrt(amountAWithDecimals * amountBWithDecimals)
        lpTokens = Math.max(0, Math.floor(sqrtProduct) - MINIMUM_LIQUIDITY)
      } else {
        // Existing pool: LP = min((amount_a * total_lp_supply) / reserve_a, (amount_b * total_lp_supply) / reserve_b)
        const lpFromA = Math.floor((amountAWithDecimals * poolInfo.totalLpSupply) / poolInfo.reserveA)
        const lpFromB = Math.floor((amountBWithDecimals * poolInfo.totalLpSupply) / poolInfo.reserveB)
        lpTokens = Math.min(lpFromA, lpFromB)
      }

      // Convert LP tokens back to human-readable format (6 decimals)
      const lpTokensHuman = lpTokens / Math.pow(10, 6)

      setCalculatedLpTokens(lpTokensHuman)

      return { lpTokens: lpTokensHuman }
    } catch (error) {
      console.error('Error calculating LP tokens:', error)
      setCalculatedLpTokens(0)
      return { lpTokens: 0 }
    }
  }

  // Function to validate ratio and calculate required amount
  const validateRatio = (amountA: number, amountB: number) => {
    if (!poolRatio || amountA <= 0) {
      setRatioError('')
      return { isValid: true, requiredAmountB: 0 }
    }

    const requiredAmountB = amountA * poolRatio.ratio
    const tolerance = 0.01 // 1% tolerance for rounding errors
    const difference = Math.abs(amountB - requiredAmountB)
    const isValid = difference <= requiredAmountB * tolerance

    // Don't show error if we have backend calculation logic that can handle adjustments
    // The backend will automatically adjust amounts to maintain the pool ratio
    if (!isValid) {
      // Only show a warning, not an error, since backend can handle it
      setRatioError(
        `Note: Your amounts don't match the pool ratio. The backend will adjust them to maintain the ratio (1 ${poolRatio.tokenA} = ${poolRatio.ratio.toFixed(6)} ${poolRatio.tokenB}).`,
      )
    } else {
      setRatioError('')
    }

    // Always return valid since backend can handle ratio adjustments
    return { isValid: true, requiredAmountB }
  }

  // Validate ratio when amounts change
  useEffect(() => {
    if (amountA && amountB && poolRatio) {
      const inputAmountA = parseFloat(amountA)
      const inputAmountB = parseFloat(amountB)
      if (!isNaN(inputAmountA) && !isNaN(inputAmountB)) {
        validateRatio(inputAmountA, inputAmountB)
      }
    } else {
      setRatioError('')
    }
  }, [amountA, amountB, poolRatio])

  // Calculate LP tokens when amounts change
  useEffect(() => {
    if (amountA && amountB) {
      const inputAmountA = parseFloat(amountA)
      const inputAmountB = parseFloat(amountB)
      if (!isNaN(inputAmountA) && !isNaN(inputAmountB) && inputAmountA > 0 && inputAmountB > 0) {
        calculateLpTokens(inputAmountA, inputAmountB)
      }
    } else {
      setCalculatedLpTokens(0)
    }
  }, [amountA, amountB, tokenA.mint, tokenB.mint, getPoolInfo])

  return {
    calculatedLpTokens,
    ratioError,
    calculateTokenBAmount,
    calculateLpTokens,
    validateRatio,
  }
}
