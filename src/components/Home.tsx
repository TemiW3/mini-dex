import React, { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Transaction, Keypair } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import { Wallet, ArrowRightLeft, TrendingUp } from 'lucide-react'
import { TOKENS, FAUCET_WALLET, FAUCET_AMOUNTS } from '../constants/tokens'

const Home: React.FC = () => {
  const { connected, publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()

  // Get faucet keypair from environment variable
  const getFaucetKeypair = () => {
    const privateKey = import.meta.env.VITE_FAUCET_PRIVATE_KEY

    if (!privateKey) {
      throw new Error('Faucet private key not found in environment variables. Please check your .env file.')
    }

    // Convert JSON array to Uint8Array
    const privateKeyBytes = new Uint8Array(JSON.parse(privateKey))
    return Keypair.fromSecretKey(privateKeyBytes)
  }

  // Faucet state
  const [faucetResult, setFaucetResult] = useState<string>('')
  const [isFauceting, setIsFauceting] = useState(false)
  const [faucetUsed, setFaucetUsed] = useState<Record<string, boolean>>({})

  // Rate limiting functions
  const checkFaucetEligibility = (tokenMint: string) => {
    if (!publicKey) return false
    const faucetKey = `faucet_used_${tokenMint}_${publicKey.toString()}`
    return !localStorage.getItem(faucetKey)
  }

  const markFaucetAsUsed = (tokenMint: string) => {
    if (!publicKey) return
    const faucetKey = `faucet_used_${tokenMint}_${publicKey.toString()}`
    localStorage.setItem(faucetKey, 'true')
    setFaucetUsed((prev) => ({ ...prev, [tokenMint]: true }))
  }

  // Load existing faucet usage on component mount
  useEffect(() => {
    if (!publicKey) return

    const usedTokens: Record<string, boolean> = {}
    TOKENS.forEach((token) => {
      const faucetKey = `faucet_used_${token.mint}_${publicKey.toString()}`
      usedTokens[token.mint] = !!localStorage.getItem(faucetKey)
    })
    setFaucetUsed(usedTokens)
  }, [publicKey])

  // Transfer-based faucet function
  const requestTestTokens = async (tokenMint: string) => {
    if (!publicKey || !signTransaction) {
      setFaucetResult('❌ Please connect your wallet first')
      return
    }

    // Check if user has already used faucet for this token
    if (!checkFaucetEligibility(tokenMint)) {
      setFaucetResult('❌ You have already claimed tokens for this token')
      return
    }

    setIsFauceting(true)
    setFaucetResult('Requesting test tokens...')

    try {
      const mint = new PublicKey(tokenMint)
      const userATA = await getAssociatedTokenAddress(mint, publicKey)

      // Use faucet wallet as source
      const sourceATA = await getAssociatedTokenAddress(mint, new PublicKey(FAUCET_WALLET))

      // Get predetermined amount for this token
      const amount = FAUCET_AMOUNTS[tokenMint] || 100

      // Find token info to get decimals
      const tokenInfo = TOKENS.find((t) => t.mint === tokenMint)
      const decimals = tokenInfo?.decimals || 6

      // Check faucet balance
      const sourceBalance = await connection.getTokenAccountBalance(sourceATA)
      const availableBalance = parseFloat(sourceBalance.value.uiAmountString || '0')

      if (availableBalance < amount) {
        setFaucetResult(`❌ Insufficient tokens in faucet. Available: ${availableBalance.toFixed(2)}`)
        return
      }

      // Get faucet keypair
      const faucetKeypair = getFaucetKeypair()

      // Check if user needs ATA creation
      const userAccountInfo = await connection.getAccountInfo(userATA)
      let ataCreated = false

      // Step 1: Create ATA if needed (separate transaction)
      if (!userAccountInfo) {
        setFaucetResult('Creating Associated Token Account...')

        try {
          const { blockhash: ataBlockhash } = await connection.getLatestBlockhash()
          const ataTx = new Transaction({
            recentBlockhash: ataBlockhash,
            feePayer: publicKey, // User pays for ATA creation
          })

          ataTx.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer (user pays for ATA creation)
              userATA, // associated token account
              publicKey, // owner (user)
              mint, // mint
            ),
          )

          const signedAtaTx = await signTransaction!(ataTx)
          const ataSerialized = signedAtaTx.serialize()
          const ataSignature = await connection.sendRawTransaction(ataSerialized)

          // Wait for ATA creation to confirm
          await connection.confirmTransaction(ataSignature)
          ataCreated = true
          setFaucetResult('ATA created, transferring tokens...')
        } catch (ataError: any) {
          console.error('ATA creation error:', ataError)
          setFaucetResult(`❌ ATA creation failed: ${ataError.message}`)
          return
        }
      }

      // Step 2: Transfer tokens (separate transaction)
      setFaucetResult('Transferring tokens...')

      let signature: string
      try {
        const { blockhash: transferBlockhash } = await connection.getLatestBlockhash()
        const transferTx = new Transaction({
          recentBlockhash: transferBlockhash,
          feePayer: publicKey, // User pays for transaction fees
        })

        transferTx.add(
          createTransferInstruction(
            sourceATA, // source (faucet wallet)
            userATA, // destination (user wallet)
            faucetKeypair.publicKey, // owner (faucet wallet - must sign)
            amount * Math.pow(10, decimals), // amount in smallest units
          ),
        )

        // Sign with faucet first, then user
        transferTx.partialSign(faucetKeypair)
        const userSignedTx = await signTransaction!(transferTx)

        // Use connection.sendRawTransaction instead of wallet adapter
        const serializedTx = userSignedTx.serialize()
        signature = await connection.sendRawTransaction(serializedTx)
      } catch (transferError: any) {
        console.error('Transfer error:', transferError)
        setFaucetResult(`❌ Transfer failed: ${transferError.message}`)
        return
      }

      // Mark as used
      markFaucetAsUsed(tokenMint)

      setFaucetResult(
        `✅ Success! Received ${amount} test tokens. Transfer: ${signature.slice(0, 8)}...${ataCreated ? ' (ATA created)' : ''}`,
      )
    } catch (error: any) {
      console.error('Faucet error:', error)
      setFaucetResult(`❌ Failed: ${error.message}`)
    } finally {
      setIsFauceting(false)
    }
  }

  if (connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Mini DEX</h1>
            <p className="text-gray-300">Trade tokens seamlessly on Solana</p>
          </div>

          {/* Test Token Faucet Section */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
              <h3 className="text-blue-400 font-semibold mb-2 text-center">🚰 Test Token Faucet</h3>
              <p className="text-blue-300 text-sm mb-4 text-center">
                Get test tokens to try out the DEX. Click the buttons below to receive test tokens for trading.
              </p>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 justify-center">
                  {TOKENS.filter((token) => FAUCET_AMOUNTS[token.mint]).map((token) => {
                    const amount = FAUCET_AMOUNTS[token.mint] || 100
                    const isUsed = faucetUsed[token.mint]
                    const isDisabled = isUsed || isFauceting || !publicKey

                    return (
                      <button
                        key={token.mint}
                        onClick={() => requestTestTokens(token.mint)}
                        disabled={isDisabled}
                        className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                          isUsed
                            ? 'bg-green-600 text-white cursor-default'
                            : isDisabled
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isUsed
                          ? `✅ ${token.symbol} claimed`
                          : isFauceting
                            ? 'Requesting...'
                            : `Get ${amount} ${token.symbol}`}
                      </button>
                    )
                  })}
                </div>
                {faucetResult && (
                  <div className="mt-2">
                    <p
                      className={`text-sm text-center ${faucetResult.includes('✅') ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {faucetResult}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <ArrowRightLeft className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Instant Swaps</h3>
              <p className="text-gray-300 text-sm">Trade tokens instantly with minimal slippage</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Best Rates</h3>
              <p className="text-gray-300 text-sm">Get the best exchange rates for your trades</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <Wallet className="w-8 h-8 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Secure</h3>
              <p className="text-gray-300 text-sm">Non-custodial trading directly from your wallet</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Logo/Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <ArrowRightLeft className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Mini DEX</h1>
          <p className="text-xl text-gray-300 mb-8">Your gateway to decentralized trading on Solana</p>
        </div>

        {/* Features */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <span>Instant token swaps</span>
          </div>
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span>Competitive rates</span>
          </div>
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <Wallet className="w-5 h-5 text-purple-400" />
            <span>Non-custodial & secure</span>
          </div>
        </div>

        {/* Connect Wallet Button */}
        <div className="mb-8">
          <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-blue-500 !rounded-xl !py-4 !px-8 !text-lg !font-semibold !transition-all !duration-300 hover:!scale-105 hover:!shadow-lg" />
        </div>

        {/* Additional Info */}
        <div className="text-gray-400 text-sm">
          <p className="mb-2">Connect your Solana wallet to start trading</p>
          <p>Supported wallets: Phantom, Solflare, and more</p>
        </div>
      </div>
    </div>
  )
}

export default Home
