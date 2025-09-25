import React from 'react'

interface TokenBalanceDisplayProps {
  tokenABalance: number
  tokenBBalance: number
  lpTokenBalance: number
  lpTokenSymbol: string
  tokenA: { symbol: string }
  tokenB: { symbol: string }
  showLpTokens?: boolean
  variant?: 'add' | 'remove'
}

const TokenBalanceDisplay: React.FC<TokenBalanceDisplayProps> = ({
  tokenABalance,
  tokenBBalance,
  lpTokenBalance,
  lpTokenSymbol,
  tokenA,
  tokenB,
  showLpTokens = true,
  variant = 'add',
}) => {
  if (variant === 'remove') {
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">{tokenA.symbol} Balance</label>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-white font-semibold">
                {tokenABalance.toFixed(4)} {tokenA.symbol}
              </p>
            </div>
          </div>
          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">{tokenB.symbol} Balance</label>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-white font-semibold">
                {tokenBBalance.toFixed(4)} {tokenB.symbol}
              </p>
            </div>
          </div>
        </div>

        {/* LP Token Balance Display */}
        {showLpTokens && lpTokenSymbol && (
          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">Your LP Tokens</label>
            <div className="bg-blue-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 font-semibold text-lg">{lpTokenBalance.toFixed(6)}</p>
                  <p className="text-blue-400 text-xs">{lpTokenSymbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-300 text-xs">Available to remove</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Add liquidity variant
  return (
    <>
      {/* LP Token Balance Display */}
      {showLpTokens && lpTokenSymbol && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-blue-300 font-semibold text-sm">Your LP Tokens</h4>
              <p className="text-blue-400 text-xs">Liquidity provider tokens for this pool</p>
            </div>
            <div className="text-right">
              <p className="text-blue-300 font-bold text-lg">{lpTokenBalance.toFixed(6)}</p>
              <p className="text-blue-400 text-xs">{lpTokenSymbol}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TokenBalanceDisplay
