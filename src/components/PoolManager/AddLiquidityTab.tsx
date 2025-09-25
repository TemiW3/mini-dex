import React, { useEffect } from 'react'
import { TOKENS } from '../../constants/tokens'
import { PoolRatio } from '../../hooks/usePoolData'
import PoolPairSelector from './PoolPairSelector'
import TokenBalanceDisplay from './TokenBalanceDisplay'
import PoolRatioInfo from './PoolRatioInfo'
import LpTokenCalculator from './LpTokenCalculator'

interface AddLiquidityTabProps {
  tokenA: (typeof TOKENS)[number]
  tokenB: (typeof TOKENS)[number]
  amountA: string
  amountB: string
  tokenABalance: number
  tokenBBalance: number
  lpTokenBalance: number
  lpTokenSymbol: string
  poolHasLiquidity: boolean
  poolRatio: PoolRatio | null
  ratioError: string
  calculatedLpTokens: number
  existingPairs: Array<{ tokenA: (typeof TOKENS)[number]; tokenB: (typeof TOKENS)[number] }>
  loadingPairs: boolean
  isLoading: boolean
  onAmountAChange: (amount: string) => void
  onAmountBChange: (amount: string) => void
  onPairSelect: (tokenA: (typeof TOKENS)[number], tokenB: (typeof TOKENS)[number]) => void
  onRefresh: () => void
  onAddLiquidity: () => void
  calculateTokenBAmount: (amountA: number) => number
}

const AddLiquidityTab: React.FC<AddLiquidityTabProps> = ({
  tokenA,
  tokenB,
  amountA,
  amountB,
  tokenABalance,
  tokenBBalance,
  lpTokenBalance,
  lpTokenSymbol,
  poolHasLiquidity,
  poolRatio,
  ratioError,
  calculatedLpTokens,
  existingPairs,
  loadingPairs,
  isLoading,
  onAmountAChange,
  onAmountBChange,
  onPairSelect,
  onRefresh,
  onAddLiquidity,
  calculateTokenBAmount,
}) => {
  // Auto-populate Token B amount when Token A changes and pool has liquidity
  useEffect(() => {
    if (poolHasLiquidity && poolRatio && amountA) {
      const inputAmountA = parseFloat(amountA)
      if (!isNaN(inputAmountA) && inputAmountA > 0) {
        const calculatedAmountB = calculateTokenBAmount(inputAmountA)
        onAmountBChange(calculatedAmountB.toFixed(6))
      }
    }
  }, [amountA, poolRatio, poolHasLiquidity, calculateTokenBAmount, onAmountBChange])

  return (
    <div className="space-y-4">
      <PoolPairSelector
        existingPairs={existingPairs}
        loadingPairs={loadingPairs}
        tokenA={tokenA}
        tokenB={tokenB}
        onPairSelect={onPairSelect}
        onRefresh={onRefresh}
      />

      <div className="space-y-3">
        <div>
          <label className="text-gray-300 text-sm font-medium mb-2 block">{tokenA.symbol} Amount</label>
          <input
            type="number"
            value={amountA}
            onChange={(e) => onAmountAChange(e.target.value)}
            className="dex-input"
            placeholder="0.0"
            step="any"
          />
          <p className="text-xs text-gray-400 mt-1">
            Balance: {tokenABalance.toFixed(4)} {tokenA.symbol}
          </p>
        </div>

        <div>
          <label className="text-gray-300 text-sm font-medium mb-2 block">
            {tokenB.symbol} Amount
            {poolHasLiquidity ? (
              <span className="text-blue-400 text-xs ml-2">(Auto-calculated)</span>
            ) : (
              <span className="text-yellow-400 text-xs ml-2">(Set initial ratio)</span>
            )}
          </label>
          <input
            type="number"
            value={amountB}
            onChange={poolHasLiquidity ? undefined : (e) => onAmountBChange(e.target.value)}
            readOnly={poolHasLiquidity}
            className={`dex-input ${poolHasLiquidity ? 'border-blue-500 bg-blue-900/10 cursor-not-allowed' : 'border-yellow-500 bg-yellow-900/10'}`}
            placeholder={poolHasLiquidity ? 'Auto-calculated based on pool ratio' : 'Set initial ratio for this pool'}
            step="any"
          />
          <p className="text-xs text-gray-400 mt-1">
            Balance: {tokenBBalance.toFixed(4)} {tokenB.symbol}
            {poolHasLiquidity && poolRatio && amountA && (
              <span className="text-blue-400 block">
                Based on pool ratio: 1 {tokenA.symbol} = {poolRatio.ratio.toFixed(6)} {tokenB.symbol}
              </span>
            )}
            {!poolHasLiquidity && (
              <span className="text-yellow-400 block">
                This pool has no liquidity yet. You can set the initial ratio.
              </span>
            )}
          </p>
        </div>
      </div>

      <TokenBalanceDisplay
        tokenABalance={tokenABalance}
        tokenBBalance={tokenBBalance}
        lpTokenBalance={lpTokenBalance}
        lpTokenSymbol={lpTokenSymbol}
        tokenA={tokenA}
        tokenB={tokenB}
        showLpTokens={true}
        variant="add"
      />

      <PoolRatioInfo
        poolHasLiquidity={poolHasLiquidity}
        poolRatio={poolRatio}
        amountA={amountA}
        ratioError={ratioError}
      />

      <LpTokenCalculator calculatedLpTokens={calculatedLpTokens} />

      <button
        onClick={onAddLiquidity}
        disabled={!amountA || !amountB || isLoading || calculatedLpTokens <= 0}
        className="w-full dex-button dex-button-success py-3"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="loading-spinner"></div>
            <span>Adding Liquidity...</span>
          </div>
        ) : calculatedLpTokens <= 0 ? (
          'Calculating LP Tokens...'
        ) : (
          `Add Liquidity (${calculatedLpTokens.toFixed(6)} LP)`
        )}
      </button>
    </div>
  )
}

export default AddLiquidityTab
