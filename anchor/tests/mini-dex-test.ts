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
})
