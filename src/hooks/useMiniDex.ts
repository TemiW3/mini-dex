import { useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  createSyncNativeInstruction,
  createAssociatedTokenAccountInstruction,
  NATIVE_MINT,
} from '@solana/spl-token'
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor'
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
        signAllTransactions: async (txs) => {
          const signedTxs = []
          for (const tx of txs) {
            const signedTx = await signTransaction(tx)
            signedTxs.push(signedTx)
          }
          return signedTxs as any
        },
      },
      { commitment: 'confirmed' },
    )

    return new Program(idl as Idl, provider)
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

  // Get vault PDA addresses
  const getVaultAddress = useCallback((poolAddress: PublicKey, vaultType: 'a' | 'b') => {
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(`vault_${vaultType}`), poolAddress.toBuffer()],
      new PublicKey(PROGRAM_ID),
    )
    return vaultPda
  }, [])

  // Get LP mint PDA address
  const getLpMintAddress = useCallback((poolAddress: PublicKey) => {
    const [lpMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('lp_mint'), poolAddress.toBuffer()],
      new PublicKey(PROGRAM_ID),
    )
    return lpMintPda
  }, [])

  // Helper function to ensure token account exists
  const ensureTokenAccountExists = useCallback(
    async (mint: PublicKey, owner: PublicKey): Promise<PublicKey> => {
      if (!signTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        // First, try to get the existing account
        const tokenAccount = await getAssociatedTokenAddress(mint, owner)
        try {
          await connection.getTokenAccountBalance(tokenAccount)
          return tokenAccount
        } catch (error) {
          // Account doesn't exist, create it
          // First, verify the mint exists
          try {
            const mintInfo = await connection.getParsedAccountInfo(mint)
            if (!mintInfo.value) {
              throw new Error(`Mint ${mint.toString()} does not exist`)
            }
          } catch (mintError) {
            throw new Error(`Mint ${mint.toString()} is invalid or does not exist`)
          }

          // Use getOrCreateAssociatedTokenAccount which handles creation automatically
          const { address } = await getOrCreateAssociatedTokenAccount(
            connection,
            { publicKey: owner, signTransaction: signTransaction! } as any,
            mint,
            owner,
            false, // allowOwnerOffCurve
            'confirmed', // commitment
          )
          return address
        }
      } catch (error) {
        throw new Error(
          `Failed to create token account for mint ${mint.toString()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    },
    [connection, signTransaction],
  )

  // Helper function to wrap SOL
  const wrapSol = useCallback(
    async (amount: number): Promise<string | null> => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const wrappedSolMint = new PublicKey('So11111111111111111111111111111111111111112')
        const wrappedSolAccount = await getAssociatedTokenAddress(wrappedSolMint, publicKey)

        // Check if wrapped SOL account exists, create if not
        let wrappedSolTokenAccount
        try {
          await connection.getTokenAccountBalance(wrappedSolAccount)
          wrappedSolTokenAccount = wrappedSolAccount
        } catch (error) {
          // Create wrapped SOL account
          const { address } = await getOrCreateAssociatedTokenAccount(
            connection,
            { publicKey, signTransaction: signTransaction! } as any,
            wrappedSolMint,
            publicKey,
            false,
            'confirmed',
          )
          wrappedSolTokenAccount = address
        }

        // Create transaction to transfer SOL to wrapped SOL account
        const transaction = new Transaction()

        // Transfer native SOL to wrapped SOL account
        const transferInstruction = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: wrappedSolTokenAccount,
          lamports: amount * LAMPORTS_PER_SOL,
        })
        transaction.add(transferInstruction)

        // Sync native instruction to wrap the SOL
        const syncNativeInstruction = createSyncNativeInstruction(wrappedSolTokenAccount)
        transaction.add(syncNativeInstruction)

        // Send transaction with fresh blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        transaction.recentBlockhash = blockhash
        transaction.feePayer = publicKey

        const signedTransaction = await signTransaction(transaction)
        const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        })

        // Wait for confirmation with timeout
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed',
        )

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`)
        }

        return signature
      } catch (error) {
        throw error
      }
    },
    [connection, publicKey, signTransaction],
  )

  // Helper function to check if vault accounts and LP mint are initialized
  const checkVaultInitialization = useCallback(
    async (
      poolData: any,
    ): Promise<{ vaultAInitialized: boolean; vaultBInitialized: boolean; lpMintInitialized: boolean }> => {
      let vaultAInitialized = false
      let vaultBInitialized = false
      let lpMintInitialized = false

      try {
        await connection.getTokenAccountBalance(poolData.tokenAVault)
        vaultAInitialized = true
      } catch (error) {
        // Vault A is not initialized
      }

      try {
        await connection.getTokenAccountBalance(poolData.tokenBVault)
        vaultBInitialized = true
      } catch (error) {
        // Vault B is not initialized
      }

      try {
        const mintInfo = await connection.getParsedAccountInfo(poolData.lpMint)
        if (mintInfo.value) {
          lpMintInitialized = true
        }
      } catch (error) {
        // LP mint is not initialized
      }

      return { vaultAInitialized, vaultBInitialized, lpMintInitialized }
    },
    [connection],
  )

  // Helper function to list existing pools
  const listExistingPools = useCallback(async () => {
    const program = getProgram()
    if (!program) return []

    try {
      const allPools = await (program as any).account.pool.all()
      return allPools
    } catch (error) {
      return []
    }
  }, [getProgram])

  // Initialize a new pool (step 1: create pool account)
  const initializePool = useCallback(
    async (tokenAMint: string, tokenBMint: string, feeRate: number): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenA = new PublicKey(tokenAMint)
        const tokenB = new PublicKey(tokenBMint)
        let poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Check if pool already exists using multiple methods
        let poolExists = false
        try {
          // Method 1: Try to fetch the pool account
          const existingPool = await (program.account as any).pool.fetch(poolPda)
          if (existingPool) {
            poolExists = true
          }
        } catch (error) {
          // Method 2: Check if the account exists at all
          try {
            const accountInfo = await connection.getAccountInfo(poolPda)
            if (accountInfo) {
              poolExists = true
            }
          } catch (accountError) {
            // Pool account does not exist, proceeding with creation
          }
        }

        if (poolExists) {
          throw new Error(
            `Pool already exists for ${tokenAMint}/${tokenBMint}. Pool address: ${poolPda.toString()}. Use a different token pair or check the existing pool.`,
          )
        }

        // Get PDA addresses for vaults and LP mint
        const tokenAVault = getVaultAddress(poolPda, 'a')
        const tokenBVault = getVaultAddress(poolPda, 'b')
        const lpMint = getLpMintAddress(poolPda)

        const tx = await program.methods
          .initializePool(feeRate, tokenAVault, tokenBVault, lpMint)
          .accounts({
            authority: publicKey,
            tokenAMint: tokenA,
            tokenBMint: tokenB,
            pool: poolPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        return tx
      } catch (error) {
        if (error instanceof Error && error.message.includes('Pool already exists')) {
          throw error
        }
        throw new Error(`Failed to create pool: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress, getVaultAddress, getLpMintAddress],
  )

  // Initialize vault A (step 2)
  const initializeVaultA = useCallback(
    async (tokenAMint: string, tokenBMint: string): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenA = new PublicKey(tokenAMint)
        let poolPda = getPoolAddress(tokenAMint, tokenBMint)
        const tokenAVault = getVaultAddress(poolPda, 'a')

        // Check if vault A already exists
        try {
          await connection.getTokenAccountBalance(tokenAVault)
          return 'Vault A already initialized'
        } catch (error) {
          // Vault A does not exist, proceeding with initialization
        }

        const tx = await program.methods
          .initializeVaultA()
          .accounts({
            authority: publicKey,
            pool: poolPda,
            tokenAMint: tokenA,
            tokenAVault: tokenAVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        return tx
      } catch (error) {
        throw new Error(`Failed to initialize vault A: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress, getVaultAddress, connection],
  )

  // Initialize vault B (step 3)
  const initializeVaultB = useCallback(
    async (tokenAMint: string, tokenBMint: string): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenB = new PublicKey(tokenBMint)
        let poolPda = getPoolAddress(tokenAMint, tokenBMint)
        const tokenBVault = getVaultAddress(poolPda, 'b')

        // Check if vault B already exists
        try {
          await connection.getTokenAccountBalance(tokenBVault)
          return 'Vault B already initialized'
        } catch (error) {
          // Vault B does not exist, proceeding with initialization
        }

        const tx = await program.methods
          .initializeVaultB()
          .accounts({
            authority: publicKey,
            pool: poolPda,
            tokenBMint: tokenB,
            tokenBVault: tokenBVault,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        return tx
      } catch (error) {
        throw new Error(`Failed to initialize vault B: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress, getVaultAddress, connection],
  )

  // Initialize LP mint (step 4)
  const initializeLpMint = useCallback(
    async (tokenAMint: string, tokenBMint: string): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        let poolPda = getPoolAddress(tokenAMint, tokenBMint)
        const lpMint = getLpMintAddress(poolPda)

        // Check if LP mint already exists
        try {
          const mintInfo = await connection.getParsedAccountInfo(lpMint)
          if (mintInfo.value) {
            return 'LP mint already initialized'
          }
        } catch (error) {
          // LP mint does not exist, proceeding with initialization
        }

        const tx = await program.methods
          .initializeLpMint()
          .accounts({
            authority: publicKey,
            pool: poolPda,
            lpMint: lpMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        return tx
      } catch (error) {
        throw new Error(`Failed to initialize LP mint: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress, getLpMintAddress, connection],
  )

  // Helper function to complete missing pool initialization steps
  const completePoolInitialization = useCallback(
    async (
      tokenAMint: string,
      tokenBMint: string,
      poolData?: any,
    ): Promise<{ completed: string[]; failed: string[] }> => {
      const completed: string[] = []
      const failed: string[] = []

      try {
        const program = getProgram()
        if (!program) throw new Error('Program not initialized')

        // Use provided pool data or fetch it
        let poolInfo = poolData
        if (!poolInfo) {
          let poolPda = getPoolAddress(tokenAMint, tokenBMint)
          try {
            poolInfo = await (program.account as any).pool.fetch(poolPda)
          } catch (fetchError) {
            throw new Error(
              `Failed to fetch pool data: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
            )
          }
        }

        // Check vault A
        try {
          await connection.getTokenAccountBalance(poolInfo.tokenAVault)
          completed.push('Vault A')
        } catch (error) {
          try {
            await initializeVaultA(tokenAMint, tokenBMint)
            completed.push('Vault A')
          } catch (vaultError) {
            failed.push('Vault A')
          }
        }

        // Check vault B
        try {
          await connection.getTokenAccountBalance(poolInfo.tokenBVault)
          completed.push('Vault B')
        } catch (error) {
          try {
            await initializeVaultB(tokenAMint, tokenBMint)
            completed.push('Vault B')
          } catch (vaultError) {
            failed.push('Vault B')
          }
        }

        // Check LP mint
        try {
          const mintInfo = await connection.getParsedAccountInfo(poolInfo.lpMint)
          if (mintInfo.value) {
            completed.push('LP Mint')
          } else {
            try {
              await initializeLpMint(tokenAMint, tokenBMint)
              completed.push('LP Mint')
            } catch (mintError) {
              failed.push('LP Mint')
            }
          }
        } catch (error) {
          try {
            await initializeLpMint(tokenAMint, tokenBMint)
            completed.push('LP Mint')
          } catch (mintError) {
            failed.push('LP Mint')
          }
        }

        return { completed, failed }
      } catch (error) {
        throw new Error(
          `Failed to complete pool initialization: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    },
    [getProgram, getPoolAddress, connection, initializeVaultA, initializeVaultB, initializeLpMint],
  )

  // Add liquidity to a pool
  const addLiquidity = useCallback(
    async (
      tokenAMint: string,
      tokenBMint: string,
      amountA: number,
      amountB: number,
      minLpTokens: number,
      tokenADecimals: number = 6,
      tokenBDecimals: number = 6,
    ): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenA = new PublicKey(tokenAMint)
        const tokenB = new PublicKey(tokenBMint)
        let poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Check if pool exists
        let poolData
        try {
          poolData = await (program.account as any).pool.fetch(poolPda)

          // Validate fee rate
          const feeRateValue =
            typeof poolData.feeRate === 'object' && poolData.feeRate?.toNumber
              ? poolData.feeRate.toNumber()
              : poolData.feeRate

          if (feeRateValue > 1000) {
            throw new Error(`Invalid fee rate in pool: ${feeRateValue}. Maximum allowed is 1000 (10%)`)
          }
        } catch (error) {
          throw new Error('Pool does not exist. Please create the pool first.')
        }

        // Check if vault accounts and LP mint are initialized
        const { vaultAInitialized, vaultBInitialized, lpMintInitialized } = await checkVaultInitialization(poolData)

        if (!vaultAInitialized || !vaultBInitialized || !lpMintInitialized) {
          try {
            const result = await completePoolInitialization(tokenAMint, tokenBMint, poolData)
            if (result.failed.length > 0) {
              throw new Error(`Failed to initialize: ${result.failed.join(', ')}`)
            }
          } catch (initError) {
            throw new Error(
              `Pool components are not fully initialized. Vault A: ${vaultAInitialized ? 'OK' : 'Missing'}, Vault B: ${vaultBInitialized ? 'OK' : 'Missing'}, LP Mint: ${lpMintInitialized ? 'OK' : 'Missing'}. Auto-initialization failed: ${initError instanceof Error ? initError.message : 'Unknown error'}`,
            )
          }
        }

        // Ensure user's associated token accounts exist (create if needed)
        const userTokenA = await ensureTokenAccountExists(tokenA, publicKey)
        const userTokenB = await ensureTokenAccountExists(tokenB, publicKey)

        // Get LP token account address (let the program handle creation with init_if_needed)
        const userLpAccount = await getAssociatedTokenAddress(new PublicKey(poolData.lpMint), publicKey)

        // Verify LP mint exists and is properly initialized
        try {
          const lpMintInfo = await connection.getParsedAccountInfo(new PublicKey(poolData.lpMint))
          if (!lpMintInfo.value) {
            throw new Error('LP mint is not properly initialized')
          }
        } catch (error) {
          throw new Error(`LP mint validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        // Get user token balances
        const userTokenAAccount = await connection.getTokenAccountBalance(userTokenA)
        const userTokenBAccount = await connection.getTokenAccountBalance(userTokenB)

        const requiredAmountA = amountA * Math.pow(10, tokenADecimals)
        const requiredAmountB = amountB * Math.pow(10, tokenBDecimals)

        // Check token A balance and wrap SOL if needed
        if (parseInt(userTokenAAccount.value.amount) < requiredAmountA) {
          if (tokenAMint === 'So11111111111111111111111111111111111111112') {
            // This is SOL, check total SOL balance (native + wrapped)
            const nativeBalance = await connection.getBalance(publicKey)
            const nativeSolBalance = nativeBalance / LAMPORTS_PER_SOL
            const wrappedSolBalance = userTokenAAccount.value.uiAmount || 0
            const totalSolBalance = nativeSolBalance + wrappedSolBalance

            if (totalSolBalance < amountA) {
              throw new Error(
                `Insufficient total SOL balance. Required: ${amountA}, Available: ${totalSolBalance.toFixed(6)} (${nativeSolBalance.toFixed(6)} native + ${wrappedSolBalance.toFixed(6)} wrapped)`,
              )
            }

            // Wrap enough SOL to meet the requirement
            const solToWrap = amountA - wrappedSolBalance
            try {
              await wrapSol(solToWrap)
              // Refresh the balance after wrapping
              const updatedTokenAAccount = await connection.getTokenAccountBalance(userTokenA)
              if (parseInt(updatedTokenAAccount.value.amount) < requiredAmountA) {
                throw new Error(
                  `Insufficient SOL balance after wrapping. Required: ${amountA}, Available: ${updatedTokenAAccount.value.uiAmount || 0}`,
                )
              }
            } catch (wrapError) {
              // Check if it's an "already processed" error and retry once
              if (wrapError instanceof Error && wrapError.message.includes('already been processed')) {
                // Wait a moment and check balance again
                await new Promise((resolve) => setTimeout(resolve, 2000))
                const retryTokenAAccount = await connection.getTokenAccountBalance(userTokenA)
                if (parseInt(retryTokenAAccount.value.amount) < requiredAmountA) {
                  throw new Error(
                    `Failed to wrap SOL: Transaction was processed but balance insufficient. Required: ${amountA}, Available: ${retryTokenAAccount.value.uiAmount || 0}`,
                  )
                }
              } else {
                throw new Error(
                  `Failed to wrap SOL: ${wrapError instanceof Error ? wrapError.message : 'Unknown error'}. Please ensure you have enough native SOL.`,
                )
              }
            }
          } else {
            throw new Error(
              `Insufficient ${tokenAMint} balance. Required: ${amountA}, Available: ${userTokenAAccount.value.uiAmount || 0}`,
            )
          }
        }

        // Check token B balance and wrap SOL if needed
        if (parseInt(userTokenBAccount.value.amount) < requiredAmountB) {
          if (tokenBMint === 'So11111111111111111111111111111111111111112') {
            // This is SOL, check total SOL balance (native + wrapped)
            const nativeBalance = await connection.getBalance(publicKey)
            const nativeSolBalance = nativeBalance / LAMPORTS_PER_SOL
            const wrappedSolBalance = userTokenBAccount.value.uiAmount || 0
            const totalSolBalance = nativeSolBalance + wrappedSolBalance

            if (totalSolBalance < amountB) {
              throw new Error(
                `Insufficient total SOL balance. Required: ${amountB}, Available: ${totalSolBalance.toFixed(6)} (${nativeSolBalance.toFixed(6)} native + ${wrappedSolBalance.toFixed(6)} wrapped)`,
              )
            }

            // Wrap enough SOL to meet the requirement
            const solToWrap = amountB - wrappedSolBalance
            try {
              await wrapSol(solToWrap)
              // Refresh the balance after wrapping
              const updatedTokenBAccount = await connection.getTokenAccountBalance(userTokenB)
              if (parseInt(updatedTokenBAccount.value.amount) < requiredAmountB) {
                throw new Error(
                  `Insufficient SOL balance after wrapping. Required: ${amountB}, Available: ${updatedTokenBAccount.value.uiAmount || 0}`,
                )
              }
            } catch (wrapError) {
              // Check if it's an "already processed" error and retry once
              if (wrapError instanceof Error && wrapError.message.includes('already been processed')) {
                // Wait a moment and check balance again
                await new Promise((resolve) => setTimeout(resolve, 2000))
                const retryTokenBAccount = await connection.getTokenAccountBalance(userTokenB)
                if (parseInt(retryTokenBAccount.value.amount) < requiredAmountB) {
                  throw new Error(
                    `Failed to wrap SOL: Transaction was processed but balance insufficient. Required: ${amountB}, Available: ${retryTokenBAccount.value.uiAmount || 0}`,
                  )
                }
              } else {
                throw new Error(
                  `Failed to wrap SOL: ${wrapError instanceof Error ? wrapError.message : 'Unknown error'}. Please ensure you have enough native SOL.`,
                )
              }
            }
          } else {
            throw new Error(
              `Insufficient ${tokenBMint} balance. Required: ${amountB}, Available: ${userTokenBAccount.value.uiAmount || 0}`,
            )
          }
        }

        // Check if there's a mismatch between calculated PDA and pool authority
        if (poolPda.toString() !== poolData.authority.toString()) {
          // Check the ownership of the pool authority
          const authorityAccountInfo = await connection.getAccountInfo(new PublicKey(poolData.authority.toString()))
          if (authorityAccountInfo) {
            // If the pool authority is a wallet address (owned by System Program) or empty, use calculated PDA
            if (
              authorityAccountInfo.owner.toString() === '11111111111111111111111111111111' ||
              authorityAccountInfo.data.length === 0
            ) {
              // poolPda remains as the calculated PDA (don't change it)
            } else {
              poolPda = new PublicKey(poolData.authority.toString())
            }
          }
        }

        try {
          const tx = await program.methods
            .addLiquidity(
              new BN(requiredAmountA),
              new BN(requiredAmountB),
              new BN(minLpTokens * Math.pow(10, 6)), // LP tokens always use 6 decimals
            )
            .accounts({
              user: publicKey,
              pool: poolPda,
              userTokenAAccount: userTokenA,
              userTokenBAccount: userTokenB,
              userLpAccount: userLpAccount,
              tokenAVault: poolData.tokenAVault,
              tokenBVault: poolData.tokenBVault,
              lpMint: poolData.lpMint,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
            })
            .rpc()

          return tx
        } catch (txError) {
          // Check if it's an "already processed" error
          if (txError instanceof Error && txError.message.includes('already been processed')) {
            // Wait a moment for the transaction to settle
            await new Promise((resolve) => setTimeout(resolve, 3000))

            // Check if the liquidity was actually added by checking LP token balance
            try {
              const updatedLpAccount = await connection.getTokenAccountBalance(userLpAccount)
              if (parseInt(updatedLpAccount.value.amount) > 0) {
                return 'liquidity-added-successfully' // Return a success indicator
              } else {
                throw new Error('Transaction was processed but no LP tokens were received')
              }
            } catch (balanceError) {
              throw new Error(
                `Transaction was processed but could not verify LP token balance: ${balanceError instanceof Error ? balanceError.message : 'Unknown error'}`,
              )
            }
          } else {
            throw txError
          }
        }
      } catch (error) {
        throw error
      }
    },
    [
      getProgram,
      publicKey,
      sendTransaction,
      getPoolAddress,
      connection,
      ensureTokenAccountExists,
      wrapSol,
      checkVaultInitialization,
      completePoolInitialization,
    ],
  )

  // Remove liquidity from a pool
  const removeLiquidity = useCallback(
    async (
      tokenAMint: string,
      tokenBMint: string,
      lpTokens: number,
      minAmountA: number,
      minAmountB: number,
      tokenADecimals: number = 6,
      tokenBDecimals: number = 6,
    ): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenA = new PublicKey(tokenAMint)
        const tokenB = new PublicKey(tokenBMint)
        let poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Check if pool exists
        let poolData
        try {
          poolData = await (program.account as any).pool.fetch(poolPda)
        } catch (error) {
          throw new Error('Pool does not exist. Please create the pool first.')
        }

        // Get user's associated token accounts
        const userTokenA = await getAssociatedTokenAddress(tokenA, publicKey)
        const userTokenB = await getAssociatedTokenAddress(tokenB, publicKey)
        const userLpToken = await getAssociatedTokenAddress(new PublicKey(poolData.lpMint), publicKey)

        // Check user LP token balance
        let userLpAccount
        try {
          userLpAccount = await connection.getTokenAccountBalance(userLpToken)
        } catch (error) {
          throw new Error(`LP token account does not exist. You may not have any LP tokens for this pool.`)
        }

        const requiredLpAmount = lpTokens * Math.pow(10, 6)

        if (parseInt(userLpAccount.value.amount) < requiredLpAmount) {
          throw new Error(
            `Insufficient LP token balance. Required: ${lpTokens}, Available: ${userLpAccount.value.uiAmount || 0}`,
          )
        }

        const tx = await program.methods
          .removeLiquidity(
            new BN(requiredLpAmount),
            new BN(minAmountA * Math.pow(10, tokenADecimals)),
            new BN(minAmountB * Math.pow(10, tokenBDecimals)),
          )
          .accounts({
            user: publicKey,
            pool: poolPda,
            userTokenAAccount: userTokenA,
            userTokenBAccount: userTokenB,
            userLpToken: userLpToken,
            tokenAVault: poolData.tokenAVault,
            tokenBVault: poolData.tokenBVault,
            lpMint: poolData.lpMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        return tx
      } catch (error) {
        throw error
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress, connection],
  )

  // Execute a token swap
  const executeSwap = useCallback(
    async (
      tokenAMint: string,
      tokenBMint: string,
      amountIn: number,
      minAmountOut: number,
      aToB: boolean,
      tokenInDecimals: number = 6,
      tokenOutDecimals: number = 6,
    ): Promise<string | null> => {
      const program = getProgram()
      if (!program || !publicKey || !sendTransaction) {
        throw new Error('Wallet not connected')
      }

      try {
        const tokenA = new PublicKey(tokenAMint)
        const tokenB = new PublicKey(tokenBMint)
        let poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Get pool data to find vault addresses
        const poolData = await (program.account as any).pool.fetch(poolPda)

        // Handle SOL wrapping - if tokenA is SOL, use wSOL (wrapped SOL)
        const isTokenASOL = tokenA.toString() === 'So11111111111111111111111111111111111111112'
        const isTokenBSOL = tokenB.toString() === 'So11111111111111111111111111111111111111112'

        const actualTokenA = isTokenASOL ? NATIVE_MINT : tokenA
        const actualTokenB = isTokenBSOL ? NATIVE_MINT : tokenB

        // Get user's associated token accounts
        const userTokenA = await getAssociatedTokenAddress(actualTokenA, publicKey)
        const userTokenB = await getAssociatedTokenAddress(actualTokenB, publicKey)

        // Check if user has ATAs, create them if they don't exist
        const userTokenAInfo = await connection.getAccountInfo(userTokenA)
        const userTokenBInfo = await connection.getAccountInfo(userTokenB)

        const tx = new Transaction()

        // Create ATA for token A if it doesn't exist
        if (!userTokenAInfo) {
          tx.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              userTokenA, // associated token account
              publicKey, // owner
              actualTokenA, // mint (wSOL if SOL)
            ),
          )
        }

        // Create ATA for token B if it doesn't exist
        if (!userTokenBInfo) {
          tx.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              userTokenB, // associated token account
              publicKey, // owner
              actualTokenB, // mint (wSOL if SOL)
            ),
          )
        }

        // If swapping from SOL, wrap it first
        if (isTokenASOL) {
          // Transfer SOL to wSOL account
          tx.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: userTokenA,
              lamports: amountIn * LAMPORTS_PER_SOL,
            }),
          )

          // Sync native instruction to update wSOL balance
          tx.add(createSyncNativeInstruction(userTokenA))
        }

        // Add the swap instruction
        const amountInWithDecimals = new BN(amountIn * Math.pow(10, tokenInDecimals))
        const minAmountOutWithDecimals = new BN(minAmountOut * Math.pow(10, tokenOutDecimals))

        const swapInstruction = await program.methods
          .swapTokens(amountInWithDecimals, minAmountOutWithDecimals, aToB)
          .accounts({
            user: publicKey,
            pool: poolPda,
            userTokenAAccount: userTokenA,
            userTokenBAccount: userTokenB,
            tokenAVault: poolData.tokenAVault,
            tokenBVault: poolData.tokenBVault,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction()

        tx.add(swapInstruction)

        // Send the transaction
        const { blockhash } = await connection.getLatestBlockhash()
        tx.recentBlockhash = blockhash
        tx.feePayer = publicKey

        const signedTx = await signTransaction!(tx)
        const serializedTx = signedTx.serialize()
        const signature = await connection.sendRawTransaction(serializedTx)

        return signature
      } catch (error) {
        throw error
      }
    },
    [getProgram, publicKey, sendTransaction, getPoolAddress, connection, signTransaction],
  )

  // Calculate swap output
  const calculateSwapOutput = useCallback(
    async (
      tokenAMint: string,
      tokenBMint: string,
      amountIn: number,
      aToB: boolean,
      tokenInDecimals: number = 6,
      tokenOutDecimals: number = 6,
    ): Promise<SwapResult | null> => {
      const program = getProgram()
      if (!program) return null

      try {
        let poolPda = getPoolAddress(tokenAMint, tokenBMint)

        // Try to fetch pool data
        const poolData = await (program.account as any).pool.fetch(poolPda)

        const reserveA = poolData.reserveA.toNumber()
        const reserveB = poolData.reserveB.toNumber()
        const feeRate = poolData.feeRate

        if (reserveA === 0 || reserveB === 0) {
          return null // Pool has no liquidity
        }

        const amountInWithDecimals = amountIn * Math.pow(10, tokenInDecimals)

        // Calculate using constant product formula with fees
        const feeAdjustedAmountIn = (amountInWithDecimals * (10000 - feeRate)) / 10000

        const [reserveIn, reserveOut] = aToB ? [reserveA, reserveB] : [reserveB, reserveA]
        const outputAmount = (feeAdjustedAmountIn * reserveOut) / (reserveIn + feeAdjustedAmountIn)

        // Calculate price impact
        const priceImpact = (amountInWithDecimals / reserveIn) * 100

        return {
          outputAmount: outputAmount / Math.pow(10, tokenOutDecimals),
          priceImpact,
          fee: (amountInWithDecimals * feeRate) / 10000 / Math.pow(10, tokenInDecimals),
        }
      } catch (error) {
        return null
      }
    },
    [getProgram, getPoolAddress],
  )

  // Check if a pool exists
  const poolExists = useCallback(
    async (tokenAMint: string, tokenBMint: string): Promise<boolean> => {
      const program = getProgram()
      if (!program) return false

      try {
        const poolAddress = getPoolAddress(tokenAMint, tokenBMint)
        await (program.account as any).pool.fetch(poolAddress)
        return true
      } catch (error) {
        return false
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
        const poolData = await (program.account as any).pool.fetch(poolAddress)

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
        return null
      }
    },
    [getProgram, getPoolAddress],
  )

  return {
    initializePool,
    initializeVaultA,
    initializeVaultB,
    initializeLpMint,
    addLiquidity,
    removeLiquidity,
    executeSwap,
    calculateSwapOutput,
    getPoolInfo,
    poolExists,
    getPoolAddress,
    getVaultAddress,
    getLpMintAddress,
    completePoolInitialization,
    listExistingPools,
  }
}
