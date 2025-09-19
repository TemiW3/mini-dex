import { useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token'
import { Program, AnchorProvider, web3, BN, Idl } from '@coral-xyz/anchor'
import { PoolInfo, SwapResult } from '../types/token'
import { PROGRAM_ID } from '../constants/tokens'
import idl from '../idl/minidex.json'

export const useMiniDex = () => {
  const { connection } = useConnection()
  const { publicKey, signTransaction, sendTransaction } = useWallet()

  // Initialize the program
  const getProgram = useCallback(() => {
    if (!publicKey || !signTransaction) return null

    const provider = new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction,
        signAllTransactions: signTransaction,
      },
      { commitment: 'confirmed' },
    )

    return new Program(idl as Idl, new PublicKey(PROGRAM_ID), provider)
  }, [connection, publicKey, signTransaction])

  // Get pool PDA address
  const getPoolAddress = useCallback((tokenAMint: string, tokenBMint: string) => {
    const programId = new PublicKey(PROGRAM_ID)
    const tokenA = new PublicKey(tokenAMint)
    const tokenB = new PublicKey(tokenBMint)

    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), tokenA.toBuffer(), tokenB.toBuffer()],
      programId,
    )

    return poolPda
  }, [])

  // Initialize a new pool
  const initializePool = useCallback(
    async (tokenAMint: string, tokenBMint: string, feeRate: number): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenA = new PublicKey(tokenAMint)
        const tokenB = new PublicKey(tokenBMint)
        const poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Generate keypairs for the accounts that need to be created
        const tokenAVault = web3.Keypair.generate()
        const tokenBVault = web3.Keypair.generate()
        const lpMint = web3.Keypair.generate()

        const tx = await program.methods
          .initializePool(feeRate)
          .accounts({
            authority: publicKey,
            pool: poolPda,
            tokenAMint: tokenA,
            tokenBMint: tokenB,
            tokenAVault: tokenAVault.publicKey,
            tokenBVault: tokenBVault.publicKey,
            lpMint: lpMint.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([tokenAVault, tokenBVault, lpMint])
          .rpc()

        return tx
      } catch (error) {
        console.error('Initialize pool error:', error)
        throw error
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress],
  )

  // Add liquidity to a pool
  const addLiquidity = useCallback(
    async (
      tokenAMint: string,
      tokenBMint: string,
      amountA: number,
      amountB: number,
      minLpTokens: number,
    ): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenA = new PublicKey(tokenAMint)
        const tokenB = new PublicKey(tokenBMint)
        const poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Get pool data to find vault addresses
        const poolData = await program.account.pool.fetch(poolPda)

        // Get user's associated token accounts
        const userTokenA = await getAssociatedTokenAddress(tokenA, publicKey)
        const userTokenB = await getAssociatedTokenAddress(tokenB, publicKey)
        const userLpToken = await getAssociatedTokenAddress(new PublicKey(poolData.lpMint), publicKey)

        const tx = await program.methods
          .addLiquidity(
            new BN(amountA * Math.pow(10, 6)), // Assuming 6 decimals for simplicity
            new BN(amountB * Math.pow(10, 6)),
            new BN(minLpTokens * Math.pow(10, 6)),
          )
          .accounts({
            user: publicKey,
            pool: poolPda,
            userTokenA,
            userTokenB,
            userLpToken,
            tokenAVault: poolData.tokenAVault,
            tokenBVault: poolData.tokenBVault,
            lpMint: poolData.lpMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc()

        return tx
      } catch (error) {
        console.error('Add liquidity error:', error)
        throw error
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress],
  )

  // Remove liquidity from a pool
  const removeLiquidity = useCallback(
    async (
      tokenAMint: string,
      tokenBMint: string,
      lpTokens: number,
      minAmountA: number,
      minAmountB: number,
    ): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenA = new PublicKey(tokenAMint)
        const tokenB = new PublicKey(tokenBMint)
        const poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Get pool data to find vault addresses
        const poolData = await program.account.pool.fetch(poolPda)

        // Get user's associated token accounts
        const userTokenA = await getAssociatedTokenAddress(tokenA, publicKey)
        const userTokenB = await getAssociatedTokenAddress(tokenB, publicKey)
        const userLpToken = await getAssociatedTokenAddress(new PublicKey(poolData.lpMint), publicKey)

        const tx = await program.methods
          .removeLiquidity(
            new BN(lpTokens * Math.pow(10, 6)),
            new BN(minAmountA * Math.pow(10, 6)),
            new BN(minAmountB * Math.pow(10, 6)),
          )
          .accounts({
            user: publicKey,
            pool: poolPda,
            userTokenA,
            userTokenB,
            userLpToken,
            tokenAVault: poolData.tokenAVault,
            tokenBVault: poolData.tokenBVault,
            lpMint: poolData.lpMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc()

        return tx
      } catch (error) {
        console.error('Remove liquidity error:', error)
        throw error
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress],
  )

  // Execute a token swap
  const executeSwap = useCallback(
    async (
      tokenAMint: string,
      tokenBMint: string,
      amountIn: number,
      minAmountOut: number,
      aToB: boolean,
    ): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenA = new PublicKey(tokenAMint)
        const tokenB = new PublicKey(tokenBMint)
        const poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Get pool data to find vault addresses
        const poolData = await program.account.pool.fetch(poolPda)

        // Get user's associated token accounts
        const userTokenA = await getAssociatedTokenAddress(tokenA, publicKey)
        const userTokenB = await getAssociatedTokenAddress(tokenB, publicKey)

        const tx = await program.methods
          .swap(new BN(amountIn * Math.pow(10, 6)), new BN(minAmountOut * Math.pow(10, 6)), aToB)
          .accounts({
            user: publicKey,
            pool: poolPda,
            userTokenA,
            userTokenB,
            tokenAVault: poolData.tokenAVault,
            tokenBVault: poolData.tokenBVault,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc()

        return tx
      } catch (error) {
        console.error('Execute swap error:', error)
        throw error
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress],
  )

  // Calculate swap output
  const calculateSwapOutput = useCallback(
    async (tokenAMint: string, tokenBMint: string, amountIn: number, aToB: boolean): Promise<SwapResult | null> => {
      const program = getProgram()
      if (!program) return null

      try {
        const poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Try to fetch pool data
        const poolData = await program.account.pool.fetch(poolPda)

        const reserveA = poolData.reserveA.toNumber()
        const reserveB = poolData.reserveB.toNumber()
        const feeRate = poolData.feeRate

        if (reserveA === 0 || reserveB === 0) {
          return null // Pool has no liquidity
        }

        const amountInWithDecimals = amountIn * Math.pow(10, 6)

        // Calculate using constant product formula with fees
        const feeAdjustedAmountIn = (amountInWithDecimals * (10000 - feeRate)) / 10000

        const [reserveIn, reserveOut] = aToB ? [reserveA, reserveB] : [reserveB, reserveA]
        const outputAmount = (feeAdjustedAmountIn * reserveOut) / (reserveIn + feeAdjustedAmountIn)

        // Calculate price impact
        const priceImpact = (amountInWithDecimals / reserveIn) * 100

        return {
          outputAmount: outputAmount / Math.pow(10, 6),
          priceImpact,
          fee: (amountInWithDecimals * feeRate) / 10000 / Math.pow(10, 6),
        }
      } catch (error) {
        console.error('Calculate swap output error:', error)
        return null
      }
    },
    [getProgram, getPoolAddress],
  )

  // Get pool information
  const getPoolInfo = useCallback(
    async (tokenAMint: string, tokenBMint: string): Promise<PoolInfo | null> => {
      const program = getProgram()
      if (!program) return null

      try {
        const poolAddress = getPoolAddress(tokenAMint, tokenBMint)

        // Fetch the pool account data
        const poolData = await program.account.pool.fetch(poolAddress)

        return {
          authority: poolData.authority.toString(),
          tokenAMint: poolData.tokenAMint.toString(),
          tokenBMint: poolData.tokenBMint.toString(),
          tokenAVault: poolData.tokenAVault.toString(),
          tokenBVault: poolData.tokenBVault.toString(),
          lpMint: poolData.lpMint.toString(),
          feeRate: poolData.feeRate,
          reserveA: poolData.reserveA.toNumber(),
          reserveB: poolData.reserveB.toNumber(),
          totalLpSupply: poolData.totalLpSupply.toNumber(),
          bump: poolData.bump,
        }
      } catch (error) {
        console.error('Get pool info error:', error)
        return null
      }
    },
    [getProgram, getPoolAddress],
  )

  return {
    initializePool,
    addLiquidity,
    removeLiquidity,
    executeSwap,
    calculateSwapOutput,
    getPoolInfo,
    getPoolAddress,
  }
}
