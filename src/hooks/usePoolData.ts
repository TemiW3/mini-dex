import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

export interface PoolRatio {
  ratio: number
  tokenA: string
  tokenB: string
}

export const usePoolData = (
  tokenA: { mint: string; symbol: string; decimals: number },
  tokenB: { mint: string; symbol: string; decimals: number },
  poolExists: (tokenAMint: string, tokenBMint: string) => Promise<boolean>,
  getPoolInfo: (tokenAMint: string, tokenBMint: string) => Promise<any>,
) => {
  const { publicKey } = useWallet()
  const [poolExistsState, setPoolExistsState] = useState<boolean | null>(null)
  const [poolRatio, setPoolRatio] = useState<PoolRatio | null>(null)
  const [poolHasLiquidity, setPoolHasLiquidity] = useState<boolean>(false)

  // Check if pool exists when tokens change
  useEffect(() => {
    const checkPoolExists = async () => {
      if (publicKey && tokenA.mint && tokenB.mint) {
        try {
          const exists = await poolExists(tokenA.mint, tokenB.mint)
          setPoolExistsState(exists)
        } catch (error) {
          console.error('Error checking pool existence:', error)
          setPoolExistsState(false)
        }
      } else {
        setPoolExistsState(null)
      }
    }

    checkPoolExists()
  }, [publicKey, tokenA.mint, tokenB.mint, poolExists])

  // Function to fetch pool ratio for existing pools
  const fetchPoolRatio = async () => {
    if (!poolExistsState || !tokenA.mint || !tokenB.mint) {
      setPoolRatio(null)
      setPoolHasLiquidity(false)
      return
    }

    try {
      const poolInfo = await getPoolInfo(tokenA.mint, tokenB.mint)
      if (poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0) {
        // Pool has liquidity - calculate the ratio (tokenB per tokenA)
        const reserveA = poolInfo.reserveA / Math.pow(10, tokenA.decimals)
        const reserveB = poolInfo.reserveB / Math.pow(10, tokenB.decimals)
        const ratio = reserveB / reserveA

        setPoolRatio({
          ratio,
          tokenA: tokenA.symbol,
          tokenB: tokenB.symbol,
        })
        setPoolHasLiquidity(true)
      } else {
        // Pool exists but has no liquidity - allow manual input
        setPoolRatio(null)
        setPoolHasLiquidity(false)
      }
    } catch (error) {
      console.error('Error fetching pool ratio:', error)
      setPoolRatio(null)
      setPoolHasLiquidity(false)
    }
  }

  // Fetch pool ratio when pool exists
  useEffect(() => {
    fetchPoolRatio()
  }, [poolExistsState, tokenA.mint, tokenB.mint, getPoolInfo])

  return {
    poolExistsState,
    poolRatio,
    poolHasLiquidity,
    fetchPoolRatio,
  }
}
