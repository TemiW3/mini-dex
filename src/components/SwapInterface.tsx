import React, { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'
import { ArrowUpDown, Settings } from 'lucide-react'
import TokenSelector from './TokenSelector'
import { TOKENS } from '../constants/tokens'
import { useMiniDex } from '../hooks/useMiniDex'

const SwapInterface: React.FC = () => {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { calculateSwapOutput, executeSwap } = useMiniDex()

  const [tokenA, setTokenA] = useState(TOKENS[0])
  const [tokenB, setTokenB] = useState(TOKENS[1])
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [slippage, setSlippage] = useState(1.0) // 1% default slippage
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [priceImpact, setPriceImpact] = useState<number | null>(null)

  // Calculate output amount when input changes
  useEffect(() => {
    if (amountA && parseFloat(amountA) > 0) {
      calculateOutput()
    } else {
      setAmountB('')
      setPriceImpact(null)
    }
  }, [amountA, tokenA, tokenB])

  const calculateOutput = async () => {
    if (!amountA || parseFloat(amountA) <= 0) return

    try {
      const inputAmount = parseFloat(amountA) * Math.pow(10, tokenA.decimals)
      const result = await calculateSwapOutput(tokenA.mint, tokenB.mint, inputAmount, true)

      if (result) {
        const outputAmount = result.outputAmount / Math.pow(10, tokenB.decimals)
        setAmountB(outputAmount.toFixed(tokenB.decimals))
        setPriceImpact(result.priceImpact)
      }
    } catch (error) {
      console.error('Error calculating swap output:', error)
      setAmountB('')
      setPriceImpact(null)
    }
  }

  const handleSwap = async () => {
    if (!publicKey || !signTransaction || !amountA || !amountB) {
      alert('Please connect your wallet and enter amounts')
      return
    }

    setIsLoading(true)
    try {
      const inputAmount = parseFloat(amountA) * Math.pow(10, tokenA.decimals)
      const minOutputAmount = parseFloat(amountB) * Math.pow(10, tokenB.decimals) * (1 - slippage / 100)

      const signature = await executeSwap(tokenA.mint, tokenB.mint, inputAmount, minOutputAmount, true)

      if (signature) {
        alert(`Swap successful! Transaction: ${signature}`)
        setAmountA('')
        setAmountB('')
        setPriceImpact(null)
      }
    } catch (error) {
      console.error('Swap failed:', error)
      alert('Swap failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFlipTokens = () => {
    setTokenA(tokenB)
    setTokenB(tokenA)
    setAmountA(amountB)
    setAmountB(amountA)
  }

  const getPriceImpactColor = (impact: number) => {
    if (impact < 0.1) return 'text-green-400'
    if (impact < 1) return 'text-yellow-400'
    if (impact < 5) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-4">
      {/* Settings */}
      {showSettings && (
        <div className="bg-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">Slippage Tolerance</span>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
          <div className="flex space-x-2">
            {[0.5, 1.0, 2.0].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-3 py-1 rounded text-sm ${
                  slippage === value ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
              className="dex-input w-20 text-sm"
              placeholder="Custom"
              step="0.1"
              min="0"
              max="50"
            />
          </div>
        </div>
      )}

      {/* From Token */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-gray-300 text-sm font-medium">From</label>
          <button onClick={() => setShowSettings(!showSettings)} className="text-gray-400 hover:text-white p-1">
            <Settings size={16} />
          </button>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <input
              type="number"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              placeholder="0.0"
              className="bg-transparent text-2xl font-semibold text-white outline-none flex-1"
              step="any"
            />
            <TokenSelector selectedToken={tokenA} onTokenSelect={setTokenA} excludeToken={tokenB} />
          </div>
          <div className="text-sm text-gray-400">
            Balance: {tokenA.balance?.toFixed(4) || '0.0000'} {tokenA.symbol}
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          onClick={handleFlipTokens}
          className="bg-gray-700 hover:bg-gray-600 rounded-full p-2 border-4 border-gray-800 transition-colors duration-200"
        >
          <ArrowUpDown size={20} className="text-gray-300" />
        </button>
      </div>

      {/* To Token */}
      <div className="space-y-2">
        <label className="text-gray-300 text-sm font-medium">To</label>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <input
              type="number"
              value={amountB}
              readOnly
              placeholder="0.0"
              className="bg-transparent text-2xl font-semibold text-white outline-none flex-1"
            />
            <TokenSelector selectedToken={tokenB} onTokenSelect={setTokenB} excludeToken={tokenA} />
          </div>
          <div className="text-sm text-gray-400">
            Balance: {tokenB.balance?.toFixed(4) || '0.0000'} {tokenB.symbol}
          </div>
        </div>
      </div>

      {/* Price Impact */}
      {priceImpact !== null && (
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Price Impact</span>
            <span className={getPriceImpactColor(priceImpact)}>{priceImpact.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-400">Slippage Tolerance</span>
            <span className="text-gray-300">{slippage}%</span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!publicKey || !amountA || !amountB || isLoading}
        className="w-full dex-button dex-button-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="loading-spinner"></div>
            <span>Swapping...</span>
          </div>
        ) : !publicKey ? (
          'Connect Wallet'
        ) : !amountA || !amountB ? (
          'Enter Amount'
        ) : (
          `Swap ${tokenA.symbol} for ${tokenB.symbol}`
        )}
      </button>

      {/* Warning for high price impact */}
      {priceImpact && priceImpact > 5 && (
        <div className="message-error">
          <p className="text-sm">
            ⚠️ High price impact ({priceImpact.toFixed(2)}%). You may lose a significant portion of your tokens.
          </p>
        </div>
      )}
    </div>
  )
}

export default SwapInterface
