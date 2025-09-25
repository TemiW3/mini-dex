import React, { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Percent, Users, RefreshCw, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TOKENS } from '../constants/tokens'
import { useMiniDex } from '../hooks/useMiniDex'
import { PoolInfo } from '../types/token'

interface PoolData {
  tokenA: string
  tokenB: string
  tokenAMint: string
  tokenBMint: string
  reserveA: number
  reserveB: number
  totalLiquidity: number
  volume24h: number
  fees24h: number
  feeRate: number
  price: number
  priceChange24h: number
  poolInfo: PoolInfo | null
}

const PoolStats: React.FC = () => {
  const { getPoolInfo, getPoolAddress, listExistingPools } = useMiniDex()
  const navigate = useNavigate()
  const [pools, setPools] = useState<PoolData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPool, setSelectedPool] = useState<string>('')

  useEffect(() => {
    loadPoolData()
  }, [getPoolInfo, listExistingPools])

  const loadPoolData = async () => {
    setLoading(true)
    try {
      const discoveredPools: PoolData[] = []

      // Get all existing pools from the blockchain
      const existingPools = await listExistingPools()

      // Process each existing pool
      for (const pool of existingPools) {
        try {
          const poolInfo = pool.account
          const tokenAMint = poolInfo.tokenAMint.toString()
          const tokenBMint = poolInfo.tokenBMint.toString()

          // Find token details from TOKENS array
          const tokenA = TOKENS.find((token) => token.mint === tokenAMint)
          const tokenB = TOKENS.find((token) => token.mint === tokenBMint)

          if (tokenA && tokenB) {
            // Convert reserves from raw amounts to human-readable amounts
            const reserveA = poolInfo.reserveA / Math.pow(10, tokenA.decimals)
            const reserveB = poolInfo.reserveB / Math.pow(10, tokenB.decimals)

            // Calculate price (tokenB per tokenA) - handle zero reserves
            const price = reserveA > 0 && reserveB > 0 ? reserveB / reserveA : 0

            // Calculate total liquidity (simplified as sum of reserves)
            const totalLiquidity = reserveA + reserveB

            // Calculate fee rate in percentage
            const feeRate = poolInfo.feeRate / 100 // Convert from basis points to percentage

            const poolData: PoolData = {
              tokenA: tokenA.symbol,
              tokenB: tokenB.symbol,
              tokenAMint: tokenAMint,
              tokenBMint: tokenBMint,
              reserveA,
              reserveB,
              totalLiquidity,
              volume24h: 0, // TODO: Implement volume tracking
              fees24h: 0, // TODO: Implement fee tracking
              feeRate,
              price,
              priceChange24h: 0, // TODO: Implement price change tracking
              poolInfo: {
                authority: poolInfo.authority.toString(),
                tokenAMint: tokenAMint,
                tokenBMint: tokenBMint,
                tokenAVault: poolInfo.tokenAVault.toString(),
                tokenBVault: poolInfo.tokenBVault.toString(),
                lpMint: poolInfo.lpMint.toString(),
                feeRate: poolInfo.feeRate,
                reserveA: poolInfo.reserveA,
                reserveB: poolInfo.reserveB,
                totalLpSupply: poolInfo.totalLpSupply,
                bump: poolInfo.bump,
              },
            }

            discoveredPools.push(poolData)
          }
        } catch (error) {
          // Skip pools that can't be processed
        }
      }

      setPools(discoveredPools)
      if (discoveredPools.length > 0) {
        setSelectedPool(`${discoveredPools[0].tokenA}-${discoveredPools[0].tokenB}`)
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(decimals)}M`
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(decimals)}K`
    } else {
      return `$${num.toFixed(decimals)}`
    }
  }

  const getPriceChangeColor = (change: number): string => {
    return change >= 0 ? 'text-green-400' : 'text-red-400'
  }

  const handleAddLiquidity = () => {
    // Navigate to the pools page where users can add liquidity
    navigate('/pools')
  }

  const StatCard = ({
    icon,
    label,
    value,
    change,
    color = 'text-white',
  }: {
    icon: React.ReactNode
    label: string
    value: string
    change?: string
    color?: string
  }) => (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-400">{icon}</div>
        {change && (
          <span className={`text-sm ${getPriceChangeColor(parseFloat(change))}`}>
            {parseFloat(change) >= 0 ? '+' : ''}
            {change}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="loading-spinner mr-3"></div>
        <span className="text-gray-400">Loading pool data...</span>
      </div>
    )
  }

  if (pools.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <Users size={48} className="text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Pools Found</h3>
          <p className="text-gray-400 mb-6">
            No liquidity pools have been initialized yet. Create your first pool to get started!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={loadPoolData} className="dex-button dex-button-secondary">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
          <button onClick={handleAddLiquidity} className="dex-button dex-button-primary">
            <Plus size={16} className="mr-2" />
            Create Pool
          </button>
        </div>
      </div>
    )
  }

  const selectedPoolData = pools.find((pool) => `${pool.tokenA}-${pool.tokenB}` === selectedPool)

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Pool Analytics</h2>
        <button onClick={loadPoolData} disabled={loading} className="dex-button dex-button-secondary flex items-center">
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Pool Selector */}
      <div className="flex flex-wrap gap-2">
        {pools.map((pool) => {
          const poolKey = `${pool.tokenA}-${pool.tokenB}`
          return (
            <button
              key={poolKey}
              onClick={() => setSelectedPool(poolKey)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedPool === poolKey
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {pool.tokenA}/{pool.tokenB}
            </button>
          )
        })}
      </div>

      {/* Selected Pool Stats */}
      {selectedPoolData && (
        <>
          <div className="stats-grid">
            <StatCard
              icon={<DollarSign size={20} />}
              label="Total Liquidity"
              value={formatNumber(selectedPoolData.totalLiquidity)}
            />
            <StatCard
              icon={<TrendingUp size={20} />}
              label="24h Volume"
              value={formatNumber(selectedPoolData.volume24h)}
            />
            <StatCard icon={<Percent size={20} />} label="24h Fees" value={formatNumber(selectedPoolData.fees24h)} />
            <StatCard
              icon={<Users size={20} />}
              label="Price"
              value={selectedPoolData.price > 0 ? `$${selectedPoolData.price.toFixed(4)}` : 'N/A'}
              change={selectedPoolData.priceChange24h.toString()}
            />
          </div>

          {/* Pool Details */}
          <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
            <h3 className="text-xl font-bold text-white mb-4">
              {selectedPoolData.tokenA}/{selectedPoolData.tokenB} Pool Details
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Reserves</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-300">{selectedPoolData.tokenA}</span>
                      <span className="text-white font-semibold">
                        {selectedPoolData.reserveA.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">{selectedPoolData.tokenB}</span>
                      <span className="text-white font-semibold">
                        {selectedPoolData.reserveB.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Fee Rate</p>
                  <p className="text-white font-semibold">{selectedPoolData.feeRate.toFixed(2)}%</p>
                </div>

                {selectedPoolData.poolInfo && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Pool Address</p>
                    <p className="text-white font-mono text-xs break-all">
                      {getPoolAddress(selectedPoolData.tokenAMint, selectedPoolData.tokenBMint).toString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Pool Ratio</p>
                  {selectedPoolData.price > 0 ? (
                    <>
                      <div className="text-white font-semibold">
                        1 {selectedPoolData.tokenA} = {selectedPoolData.price.toFixed(6)} {selectedPoolData.tokenB}
                      </div>
                      <div className="text-gray-300">
                        1 {selectedPoolData.tokenB} = {(1 / selectedPoolData.price).toFixed(6)}{' '}
                        {selectedPoolData.tokenA}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-400">No liquidity - price will be set when first liquidity is added</div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Total LP Supply</p>
                  <p className="text-white font-semibold">
                    {selectedPoolData.poolInfo?.totalLpSupply
                      ? (selectedPoolData.poolInfo.totalLpSupply / Math.pow(10, 6)).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        selectedPoolData.totalLiquidity > 0 ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    ></div>
                    <span
                      className={`font-semibold ${
                        selectedPoolData.totalLiquidity > 0 ? 'text-green-400' : 'text-yellow-400'
                      }`}
                    >
                      {selectedPoolData.totalLiquidity > 0 ? 'Active' : 'Initialized'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pool Actions */}
          <div className="flex flex-wrap gap-4">
            <button onClick={handleAddLiquidity} className="dex-button dex-button-primary flex items-center">
              <Plus size={16} className="mr-2" />
              Add Liquidity
            </button>
            <button className="dex-button dex-button-secondary">Remove Liquidity</button>
            <button className="dex-button dex-button-secondary">Swap Tokens</button>
          </div>
        </>
      )}

      {/* All Pools Overview */}
      <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600">
        <h3 className="text-xl font-bold text-white mb-4">All Pools</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-600">
                <th className="text-left py-3">Pool</th>
                <th className="text-right py-3">Liquidity</th>
                <th className="text-right py-3">Volume (24h)</th>
                <th className="text-right py-3">Fees (24h)</th>
                <th className="text-right py-3">Price</th>
                <th className="text-right py-3">Change (24h)</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool) => (
                <tr
                  key={`${pool.tokenA}-${pool.tokenB}`}
                  className="border-b border-gray-700 hover:bg-gray-700/30 cursor-pointer"
                  onClick={() => setSelectedPool(`${pool.tokenA}-${pool.tokenB}`)}
                >
                  <td className="py-4">
                    <div className="font-semibold text-white">
                      {pool.tokenA}/{pool.tokenB}
                    </div>
                    <div className="text-gray-400 text-xs">Fee: {pool.feeRate}%</div>
                  </td>
                  <td className="text-right py-4 text-white">{formatNumber(pool.totalLiquidity)}</td>
                  <td className="text-right py-4 text-gray-400">
                    {pool.volume24h > 0 ? formatNumber(pool.volume24h) : 'N/A'}
                  </td>
                  <td className="text-right py-4 text-gray-400">
                    {pool.fees24h > 0 ? formatNumber(pool.fees24h) : 'N/A'}
                  </td>
                  <td className="text-right py-4 text-white">{pool.price > 0 ? pool.price.toFixed(6) : 'N/A'}</td>
                  <td className="text-right py-4 text-gray-400">
                    {pool.priceChange24h !== 0
                      ? `${pool.priceChange24h >= 0 ? '+' : ''}${pool.priceChange24h}%`
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PoolStats
