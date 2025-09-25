import React from 'react'
import { RefreshCw } from 'lucide-react'
import { TOKENS } from '../../constants/tokens'

interface PoolPairSelectorProps {
  existingPairs: Array<{ tokenA: (typeof TOKENS)[number]; tokenB: (typeof TOKENS)[number] }>
  loadingPairs: boolean
  tokenA: (typeof TOKENS)[number]
  tokenB: (typeof TOKENS)[number]
  onPairSelect: (tokenA: (typeof TOKENS)[number], tokenB: (typeof TOKENS)[number]) => void
  onRefresh: () => void
}

const PoolPairSelector: React.FC<PoolPairSelectorProps> = ({
  existingPairs,
  loadingPairs,
  tokenA,
  tokenB,
  onPairSelect,
  onRefresh,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label className="text-gray-300 text-sm font-medium mb-2 block">Pair</label>
        <div className="relative">
          <select
            className="dex-input pr-10"
            value={existingPairs.findIndex((p) => p.tokenA.mint === tokenA.mint && p.tokenB.mint === tokenB.mint)}
            onChange={(e) => {
              const idx = parseInt(e.target.value)
              if (!isNaN(idx) && existingPairs[idx]) {
                onPairSelect(existingPairs[idx].tokenA, existingPairs[idx].tokenB)
              }
            }}
            disabled={loadingPairs || existingPairs.length === 0}
          >
            {existingPairs.length === 0 ? (
              <option value={-1}>No initialized pools found</option>
            ) : (
              existingPairs.map((p, i) => (
                <option key={`${p.tokenA.mint}-${p.tokenB.mint}`} value={i}>
                  {p.tokenA.symbol}/{p.tokenB.symbol}
                </option>
              ))
            )}
          </select>
          {loadingPairs && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onRefresh}
        className="ml-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        title="Refresh balances and pairs"
        disabled={loadingPairs}
      >
        <RefreshCw size={16} className={`text-gray-300 ${loadingPairs ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}

export default PoolPairSelector
