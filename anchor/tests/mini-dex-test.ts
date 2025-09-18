import { describe, it } from 'mocha'
import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Minidex } from '../target/types/minidex'
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  createAssociatedTokenAccount,
  getAccount,
} from '@solana/spl-token'
import { expect } from 'chai'

describe('MiniDex', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Minidex as Program<Minidex>

  // Test accounts
  let tokenAMint: PublicKey
  let tokenBMint: PublicKey
  let lpMint: PublicKey
  let poolPda: PublicKey
  let poolBump: number
  let tokenAVault: PublicKey
  let tokenBVault: PublicKey

  // User accounts
  let authority: Keypair
  let user: Keypair
  let userTokenA: PublicKey
  let userTokenB: PublicKey
  let userLpToken: PublicKey

  // Test constants
  const FEE_RATE = 30 // 0.3%
  const INITIAL_MINT_AMOUNT = 1000000 // 1M tokens

  before(async () => {
    // Initialize keypairs
    authority = Keypair.generate()
    user = Keypair.generate()

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(authority.publicKey, 10 * LAMPORTS_PER_SOL)
    await provider.connection.requestAirdrop(user.publicKey, 10 * LAMPORTS_PER_SOL)

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Create token mints
    tokenAMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      6, // decimals
    )

    tokenBMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      6, // decimals
    )

    // Create user token accounts
    userTokenA = await createAccount(provider.connection, user, tokenAMint, user.publicKey)

    userTokenB = await createAccount(provider.connection, user, tokenBMint, user.publicKey)

    // Mint tokens to user
    await mintTo(provider.connection, authority, tokenAMint, userTokenA, authority.publicKey, INITIAL_MINT_AMOUNT)

    await mintTo(provider.connection, authority, tokenBMint, userTokenB, authority.publicKey, INITIAL_MINT_AMOUNT)
    ;[poolPda, poolBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
      program.programId,
    )
  })

  describe('Pool Initialization Tests', () => {
    it('Should fail with invalid fee rate', async () => {
      const invalidFeeRate = 1001 // > 10%

      try {
        // Derive PDA addresses for vaults and LP mint
        const [tokenAVaultPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('vault_a'), poolPda.toBuffer()],
          program.programId,
        )

        const [tokenBVaultPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('vault_b'), poolPda.toBuffer()],
          program.programId,
        )

        const [lpMintPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('lp_mint'), poolPda.toBuffer()],
          program.programId,
        )

        tokenAVault = tokenAVaultPda
        tokenBVault = tokenBVaultPda
        lpMint = lpMintPda

        await program.methods
          .initializePool(invalidFeeRate, tokenAVault, tokenBVault, lpMint)
          .accountsStrict({
            authority: authority.publicKey,
            pool: poolPda,
            tokenAMint: tokenAMint,
            tokenBMint: tokenBMint,
            systemProgram: SystemProgram.programId,
          })
          .signers([authority])
          .rpc()

        expect.fail('Should have failed with invalid fee rate')
      } catch (error) {
        expect(error.message).to.include('Invalid fee rate')
      }
    })

    it('Should initialize the liquidity pool', async () => {
      // Derive PDA addresses for vaults and LP mint
      const [tokenAVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_a'), poolPda.toBuffer()],
        program.programId,
      )

      const [tokenBVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_b'), poolPda.toBuffer()],
        program.programId,
      )

      const [lpMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('lp_mint'), poolPda.toBuffer()],
        program.programId,
      )

      tokenAVault = tokenAVaultPda
      tokenBVault = tokenBVaultPda
      lpMint = lpMintPda

      // Step 1: Initialize pool (lightweight - just pool account)
      await program.methods
        .initializePool(FEE_RATE, tokenAVault, tokenBVault, lpMint)
        .accountsStrict({
          authority: authority.publicKey,
          pool: poolPda,
          tokenAMint: tokenAMint,
          tokenBMint: tokenBMint,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      // Step 2: Setup token A vault (creates vault A PDA)
      await program.methods
        .initializeVaultA()
        .accountsStrict({
          authority: authority.publicKey,
          pool: poolPda,
          tokenAMint: tokenAMint,
          tokenAVault: tokenAVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      // Step 3: Setup token B vault (creates vault B PDA)
      await program.methods
        .initializeVaultB()
        .accountsStrict({
          authority: authority.publicKey,
          pool: poolPda,
          tokenBMint: tokenBMint,
          tokenBVault: tokenBVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      // Step 4: Setup LP mint (creates LP mint PDA)
      await program.methods
        .initializeLpMint()
        .accountsStrict({
          authority: authority.publicKey,
          pool: poolPda,
          lpMint: lpMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc()

      // Verify pool state
      const poolAccount = await program.account.pool.fetch(poolPda)
      expect(poolAccount.authority.toString()).to.equal(authority.publicKey.toString())
      expect(poolAccount.tokenAMint.toString()).to.equal(tokenAMint.toString())
      expect(poolAccount.tokenBMint.toString()).to.equal(tokenBMint.toString())
      expect(poolAccount.feeRate).to.equal(FEE_RATE)
      expect(poolAccount.reserveA.toNumber()).to.equal(0)
      expect(poolAccount.reserveB.toNumber()).to.equal(0)
      expect(poolAccount.totalLpSupply.toNumber()).to.equal(0)
    })
  })

  describe('Liquidity Provision Tests', () => {
    before(async () => {
      // Create user LP token account
      userLpToken = await createAssociatedTokenAccount(provider.connection, user, lpMint, user.publicKey)
    })

    it('Should provide liquidity to the pool', async () => {
      const amountA = 10000
      const amountB = 40000
      const minLpTokens = 1000

      await program.methods
        .addLiquidity(new anchor.BN(amountA), new anchor.BN(amountB), new anchor.BN(minLpTokens))
        .accountsStrict({
          user: user.publicKey,
          pool: poolPda,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          userLpAccount: userLpToken,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          lpMint: lpMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc()

      // Verify pool state
      const poolAccount = await program.account.pool.fetch(poolPda)
      expect(poolAccount.reserveA.toNumber()).to.equal(amountA)
      expect(poolAccount.reserveB.toNumber()).to.equal(amountB)

      // Check LP tokens (should be sqrt(10000 * 40000) - 1000 = 19000)
      const userLpBalance = await getAccount(provider.connection, userLpToken)
      expect(Number(userLpBalance.amount)).to.equal(19000)

      // Total supply should be 20000 (19000 to user + 1000 minimum liquidity locked)
      expect(poolAccount.totalLpSupply.toNumber()).to.equal(20000)
    })

    it('Should add subsequent liquidity maintaining ratio', async () => {
      const amountA = 5000
      const amountB = 20000
      const minLpTokens = 9000

      await program.methods
        .addLiquidity(new anchor.BN(amountA), new anchor.BN(amountB), new anchor.BN(minLpTokens))
        .accountsStrict({
          user: user.publicKey,
          pool: poolPda,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          userLpAccount: userLpToken,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          lpMint: lpMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc()

      // Verify updated pool state
      const poolAccount = await program.account.pool.fetch(poolPda)
      expect(poolAccount.reserveA.toNumber()).to.equal(15000)
      expect(poolAccount.reserveB.toNumber()).to.equal(60000)

      // Check LP tokens (should have 19000 + 10000 = 29000)
      // Calculation: (5000 * 20000) / 10000 = 10000 LP tokens for this addition
      const userLpBalance = await getAccount(provider.connection, userLpToken)
      expect(Number(userLpBalance.amount)).to.equal(29000)
    })

    it('Should fail with slippage protection', async () => {
      const amountA = 1000
      const amountB = 4000
      const minLpTokens = 5000 // Too high expectation

      try {
        await program.methods
          .addLiquidity(new anchor.BN(amountA), new anchor.BN(amountB), new anchor.BN(minLpTokens))
          .accountsStrict({
            user: user.publicKey,
            pool: poolPda,
            userTokenAAccount: userTokenA,
            userTokenBAccount: userTokenB,
            userLpAccount: userLpToken,
            tokenAVault: tokenAVault,
            tokenBVault: tokenBVault,
            lpMint: lpMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc()

        expect.fail('Should have failed with slippage exceeded')
      } catch (error) {
        expect(error.message).to.include('SlippageExceeded')
      }
    })
  })

  describe('Token Swap Tests', () => {
    it('Should swap Token A for Token B', async () => {
      const amountIn = 1000
      const minAmountOut = 3500 // More reasonable expectation
      const aToB = true

      // Get initial balances
      const initialTokenA = await getAccount(provider.connection, userTokenA)
      const initialTokenB = await getAccount(provider.connection, userTokenB)

      await program.methods
        .swapTokens(new anchor.BN(amountIn), new anchor.BN(minAmountOut), aToB)
        .accountsStrict({
          user: user.publicKey,
          pool: poolPda,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc()

      // Check balances changed
      const finalTokenA = await getAccount(provider.connection, userTokenA)
      const finalTokenB = await getAccount(provider.connection, userTokenB)

      expect(Number(finalTokenA.amount)).to.equal(Number(initialTokenA.amount) - amountIn)
      expect(Number(finalTokenB.amount)).to.be.greaterThan(Number(initialTokenB.amount))

      // Verify pool reserves updated
      const poolAccount = await program.account.pool.fetch(poolPda)
      expect(poolAccount.reserveA.toNumber()).to.equal(16000) // 15000 + 1000
      expect(poolAccount.reserveB.toNumber()).to.be.lessThan(60000) // Should decrease
    })

    it('Should swap Token B for Token A', async () => {
      const amountIn = 4000
      const minAmountOut = 800 // More reasonable expectation
      const aToB = false

      // Get initial balances
      const initialTokenA = await getAccount(provider.connection, userTokenA)
      const initialTokenB = await getAccount(provider.connection, userTokenB)

      await program.methods
        .swapTokens(new anchor.BN(amountIn), new anchor.BN(minAmountOut), aToB)
        .accountsStrict({
          user: user.publicKey,
          pool: poolPda,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc()

      // Check balances changed
      const finalTokenA = await getAccount(provider.connection, userTokenA)
      const finalTokenB = await getAccount(provider.connection, userTokenB)

      expect(Number(finalTokenB.amount)).to.equal(Number(initialTokenB.amount) - amountIn)
      expect(Number(finalTokenA.amount)).to.be.greaterThan(Number(initialTokenA.amount))
    })

    it('Should fail with slippage protection', async () => {
      const amountIn = 1000
      const minAmountOut = 10000 // Unrealistic expectation
      const aToB = true

      try {
        await program.methods
          .swapTokens(new anchor.BN(amountIn), new anchor.BN(minAmountOut), aToB)
          .accountsStrict({
            user: user.publicKey,
            pool: poolPda,
            userTokenAAccount: userTokenA,
            userTokenBAccount: userTokenB,
            tokenAVault: tokenAVault,
            tokenBVault: tokenBVault,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc()

        expect.fail('Should have failed with slippage exceeded')
      } catch (error) {
        expect(error.message).to.include('SlippageExceeded')
      }
    })
  })

  describe('Liquidity Removal Tests', () => {
    it('Should remove liquidity from the pool', async () => {
      const lpTokens = 10000
      const minAmountA = 2000
      const minAmountB = 8000

      // Get initial balances
      const initialTokenA = await getAccount(provider.connection, userTokenA)
      const initialTokenB = await getAccount(provider.connection, userTokenB)
      const initialLpTokens = await getAccount(provider.connection, userLpToken)

      await program.methods
        .removeLiquidity(new anchor.BN(lpTokens), new anchor.BN(minAmountA), new anchor.BN(minAmountB))
        .accountsStrict({
          user: user.publicKey,
          pool: poolPda,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          userLpToken: userLpToken,
          tokenAVault: tokenAVault,
          tokenBVault: tokenBVault,
          lpMint: lpMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc()

      // Check LP tokens were burned
      const finalLpTokens = await getAccount(provider.connection, userLpToken)
      expect(Number(finalLpTokens.amount)).to.equal(Number(initialLpTokens.amount) - lpTokens)

      // Check received tokens
      const finalTokenA = await getAccount(provider.connection, userTokenA)
      const finalTokenB = await getAccount(provider.connection, userTokenB)

      expect(Number(finalTokenA.amount)).to.be.greaterThan(Number(initialTokenA.amount))
      expect(Number(finalTokenB.amount)).to.be.greaterThan(Number(initialTokenB.amount))

      // Verify pool reserves decreased
      const poolAccount = await program.account.pool.fetch(poolPda)
      expect(poolAccount.totalLpSupply.toNumber()).to.be.lessThan(30000)
    })

    it('Should fail with slippage protection', async () => {
      const lpTokens = 1000
      const minAmountA = 10000 // Unrealistic expectation
      const minAmountB = 40000

      try {
        await program.methods
          .removeLiquidity(new anchor.BN(lpTokens), new anchor.BN(minAmountA), new anchor.BN(minAmountB))
          .accountsStrict({
            user: user.publicKey,
            pool: poolPda,
            userTokenAAccount: userTokenA,
            userTokenBAccount: userTokenB,
            userLpToken: userLpToken,
            tokenAVault: tokenAVault,
            tokenBVault: tokenBVault,
            lpMint: lpMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc()

        expect.fail('Should have failed with slippage exceeded')
      } catch (error) {
        expect(error.message).to.include('SlippageExceeded')
      }
    })

    it('Should fail with insufficient LP tokens', async () => {
      const lpTokens = 10000000 // More than user has
      const minAmountA = 1
      const minAmountB = 1

      try {
        await program.methods
          .removeLiquidity(new anchor.BN(lpTokens), new anchor.BN(minAmountA), new anchor.BN(minAmountB))
          .accountsStrict({
            user: user.publicKey,
            pool: poolPda,
            userTokenAAccount: userTokenA,
            userTokenBAccount: userTokenB,
            userLpToken: userLpToken,
            tokenAVault: tokenAVault,
            tokenBVault: tokenBVault,
            lpMint: lpMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc()

        expect.fail('Should have failed with insufficient LP tokens')
      } catch (error) {
        expect(error.message).to.include('InsufficientLPTokens')
      }
    })
  })
})
