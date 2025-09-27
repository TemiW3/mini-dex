import React from 'react'
import { PoolRatio } from '../../hooks/usePoolData'

interface PoolRatioInfoProps {
  poolHasLiquidity: boolean
  poolRatio: PoolRatio | null
  amountA: string
  ratioError: string
}

const PoolRatioInfo: React.FC<PoolRatioInfoProps> = ({ poolHasLiquidity, poolRatio, ratioError }) => {
  return (
    <>
      {/* Pool Ratio Information */}
      {poolHasLiquidity && poolRatio && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-blue-400 font-semibold mb-2">Pool Ratio Information</h4>
          <p className="text-sm text-blue-300">
            Current ratio:{' '}
            <span className="font-mono">
              1 {poolRatio.tokenA} = {poolRatio.ratio.toFixed(6)} {poolRatio.tokenB}
            </span>
          </p>
          <p className="text-xs text-blue-400 mt-1">
            Your amounts must maintain this ratio to prevent arbitrage attacks.
          </p>
        </div>
      )}

      {/* Initial Liquidity Information */}
      {!poolHasLiquidity && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-yellow-400 font-semibold mb-2">Initial Liquidity</h4>
          <p className="text-sm text-yellow-300">
            This pool exists but has no liquidity yet. You can set the initial ratio by entering both token amounts.
          </p>
          <p className="text-xs text-yellow-400 mt-1">
            The ratio you set will become the pool's initial price. Choose carefully!
          </p>
        </div>
      )}

      {/* Ratio Warning */}
      {ratioError && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-yellow-400 font-semibold mb-2">ℹ️ Ratio Adjustment</h4>
          <p className="text-sm text-yellow-300">{ratioError}</p>
        </div>
      )}
    </>
  )
}

export default PoolRatioInfo
