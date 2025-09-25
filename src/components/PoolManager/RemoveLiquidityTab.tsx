import React from 'react'
import { TOKENS } from '../../constants/tokens'
import PoolPairSelector from './PoolPairSelector'
import TokenBalanceDisplay from './TokenBalanceDisplay'

interface RemoveLiquidityTabProps {
  tokenA: (typeof TOKENS)[number]
  tokenB: (typeof TOKENS)[number]
  lpTokens: string
  tokenABalance: number
  tokenBBalance: number
  lpTokenBalance: number
  lpTokenSymbol: string
  existingPairs: Array<{ tokenA: (typeof TOKENS)[number]; tokenB: (typeof TOKENS)[number] }>
  loadingPairs: boolean
  isLoading: boolean
  onLpTokensChange: (amount: string) => void
  onPairSelect: (tokenA: (typeof TOKENS)[number], tokenB: (typeof TOKENS)[number]) => void
  onRefresh: () => void
  onRemoveLiquidity: () => void
}

const RemoveLiquidityTab: React.FC<RemoveLiquidityTabProps> = ({
  tokenA,
  tokenB,
  lpTokens,
  tokenABalance,
  tokenBBalance,
  lpTokenBalance,
  lpTokenSymbol,
  existingPairs,
  loadingPairs,
  isLoading,
  onLpTokensChange,
  onPairSelect,
  onRefresh,
  onRemoveLiquidity,
}) => {
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

      <TokenBalanceDisplay
        tokenABalance={tokenABalance}
        tokenBBalance={tokenBBalance}
        lpTokenBalance={lpTokenBalance}
        lpTokenSymbol={lpTokenSymbol}
        tokenA={tokenA}
        tokenB={tokenB}
        showLpTokens={true}
        variant="remove"
      />

      <div>
        <label className="text-gray-300 text-sm font-medium mb-2 block">LP Tokens to Remove</label>
        <input
          type="number"
          value={lpTokens}
          onChange={(e) => onLpTokensChange(e.target.value)}
          className="dex-input"
          placeholder="0.0"
          step="any"
        />
        <p className="text-xs text-gray-400 mt-1">LP Balance: {lpTokenBalance.toFixed(4)} LP Tokens</p>
      </div>

      <button
        onClick={onRemoveLiquidity}
        disabled={!lpTokens || isLoading}
        className="w-full dex-button dex-button-warning py-3"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="loading-spinner"></div>
            <span>Removing Liquidity...</span>
          </div>
        ) : (
          'Remove Liquidity'
        )}
      </button>
    </div>
  )
}

export default RemoveLiquidityTab
