import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { TOKENS } from '../constants/tokens'

export interface TokenBalance {
  tokenABalance: number
  tokenBBalance: number
  lpTokenBalance: number
  lpTokenSymbol: string
}

export const useTokenBalances = (
  tokenA: (typeof TOKENS)[number],
  tokenB: (typeof TOKENS)[number],
  poolExistsState: boolean | null,
  getPoolInfo: (tokenAMint: string, tokenBMint: string) => Promise<any>,
) => {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [tokenABalance, setTokenABalance] = useState<number>(0)
  const [tokenBBalance, setTokenBBalance] = useState<number>(0)
  const [lpTokenBalance, setLpTokenBalance] = useState<number>(0)
  const [lpTokenSymbol, setLpTokenSymbol] = useState<string>('')

  const fetchTokenBalances = async () => {
    if (!publicKey) {
      setTokenABalance(0)
      setTokenBBalance(0)
      setLpTokenBalance(0)
      return
    }

    try {
      // Fetch Token A balance
      if (tokenA.mint === 'So11111111111111111111111111111111111111112') {
        // SOL balance (native + wrapped)
        const nativeSolBalance = await connection.getBalance(publicKey)
        const nativeSol = nativeSolBalance / 1e9 // Convert lamports to SOL

        // Get wrapped SOL balance
        const wrappedSolAccount = await getAssociatedTokenAddress(new PublicKey(tokenA.mint), publicKey)
        let wrappedSol = 0
        try {
          const wrappedSolBalanceInfo = await connection.getTokenAccountBalance(wrappedSolAccount)
          wrappedSol = parseFloat(wrappedSolBalanceInfo.value.uiAmountString || '0')
        } catch (error) {
          // Wrapped SOL account doesn't exist, wrapped balance is 0
        }

        setTokenABalance(nativeSol + wrappedSol)
      } else {
        // Token balance
        const tokenAAccount = await getAssociatedTokenAddress(new PublicKey(tokenA.mint), publicKey)
        try {
          const tokenABalanceInfo = await connection.getTokenAccountBalance(tokenAAccount)
          setTokenABalance(parseFloat(tokenABalanceInfo.value.uiAmountString || '0'))
        } catch (error) {
          setTokenABalance(0)
        }
      }

      // Fetch Token B balance
      if (tokenB.mint === 'So11111111111111111111111111111111111111112') {
        // SOL balance (native + wrapped)
        const nativeSolBalance = await connection.getBalance(publicKey)
        const nativeSol = nativeSolBalance / 1e9 // Convert lamports to SOL

        // Get wrapped SOL balance
        const wrappedSolAccount = await getAssociatedTokenAddress(new PublicKey(tokenB.mint), publicKey)
        let wrappedSol = 0
        try {
          const wrappedSolBalanceInfo = await connection.getTokenAccountBalance(wrappedSolAccount)
          wrappedSol = parseFloat(wrappedSolBalanceInfo.value.uiAmountString || '0')
        } catch (error) {
          // Wrapped SOL account doesn't exist, wrapped balance is 0
        }

        setTokenBBalance(nativeSol + wrappedSol)
      } else {
        // Token balance
        const tokenBAccount = await getAssociatedTokenAddress(new PublicKey(tokenB.mint), publicKey)
        try {
          const tokenBBalanceInfo = await connection.getTokenAccountBalance(tokenBAccount)
          setTokenBBalance(parseFloat(tokenBBalanceInfo.value.uiAmountString || '0'))
        } catch (error) {
          setTokenBBalance(0)
        }
      }

      // Fetch LP token balance if pool exists
      if (poolExistsState) {
        try {
          const poolInfo = await getPoolInfo(tokenA.mint, tokenB.mint)
          if (poolInfo) {
            const lpTokenAccount = await getAssociatedTokenAddress(new PublicKey(poolInfo.lpMint), publicKey)
            try {
              const lpBalanceInfo = await connection.getTokenAccountBalance(lpTokenAccount)
              setLpTokenBalance(parseFloat(lpBalanceInfo.value.uiAmountString || '0'))
              // Set LP token symbol (e.g., "SOL-TUSDC LP")
              setLpTokenSymbol(`${tokenA.symbol}-${tokenB.symbol} LP`)
            } catch (error) {
              setLpTokenBalance(0)
              setLpTokenSymbol('')
            }
          } else {
            setLpTokenBalance(0)
            setLpTokenSymbol('')
          }
        } catch (error) {
          setLpTokenBalance(0)
          setLpTokenSymbol('')
        }
      } else {
        setLpTokenBalance(0)
        setLpTokenSymbol('')
      }
    } catch (error) {
      console.error('Error fetching token balances:', error)
      setTokenABalance(0)
      setTokenBBalance(0)
      setLpTokenBalance(0)
      setLpTokenSymbol('')
    }
  }

  useEffect(() => {
    fetchTokenBalances()
  }, [publicKey, tokenA.mint, tokenB.mint, poolExistsState, getPoolInfo])

  return {
    tokenABalance,
    tokenBBalance,
    lpTokenBalance,
    lpTokenSymbol,
    fetchTokenBalances,
  }
}
