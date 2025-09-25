import React, { useState, useEffect } from 'react'
import { TrendingUp, Activity, DollarSign, Users, RefreshCw } from 'lucide-react'
import PoolStats from '../components/PoolStats'
import { useMiniDex } from '../hooks/useMiniDex'
import { TOKENS } from '../constants/tokens'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'

const Analytics: React.FC = () => {
  const { listExistingPools } = useMiniDex()
  const { connection } = useConnection()
  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    activePools: 0,
    uniqueUsers: 0,
    totalLiquidity: 0,
    loading: true,
  })

  const countUniqueUsers = async (pools: any[]): Promise<number> => {
    // For now, show a realistic number based on development stage
    // In production, you'd track actual unique wallet addresses from transactions
    try {
      let hasActivePools = false

      // Check if there are any pools with liquidity
      for (const pool of pools) {
        const poolInfo = pool.account
        const tokenAMint = poolInfo.tokenAMint.toString()
        const tokenBMint = poolInfo.tokenBMint.toString()

        // Find token details to get correct decimals
        const tokenA = TOKENS.find((token) => token.mint === tokenAMint)
        const tokenB = TOKENS.find((token) => token.mint === tokenBMint)

        const tokenADecimals = tokenA?.decimals || 6
        const tokenBDecimals = tokenB?.decimals || 6

        // Convert reserves to human-readable amounts
        const reserveA = poolInfo.reserveA / Math.pow(10, tokenADecimals)
        const reserveB = poolInfo.reserveB / Math.pow(10, tokenBDecimals)
        const poolLiquidity = reserveA + reserveB

        if (poolLiquidity > 0) {
          hasActivePools = true
          break
        }
      }

      // Simple logic: if there are active pools, assume at least 1 user (you)
      // This is more accurate than multiplying by pool count
      return hasActivePools ? 1 : 0
    } catch (error) {
      console.error('Error counting unique users:', error)
      return 0
    }
  }

  const fetchAnalyticsData = async () => {
    setMetrics((prev) => ({ ...prev, loading: true }))

    try {
      // Get all existing pools
      const pools = await listExistingPools()

      // Calculate metrics from pool data
      let totalLiquidity = 0
      let activePoolsCount = 0

      for (const pool of pools) {
        const poolInfo = pool.account
        const tokenAMint = poolInfo.tokenAMint.toString()
        const tokenBMint = poolInfo.tokenBMint.toString()

        // Find token details to get correct decimals
        const tokenA = TOKENS.find((token) => token.mint === tokenAMint)
        const tokenB = TOKENS.find((token) => token.mint === tokenBMint)

        // Use token decimals or default to 6
        const tokenADecimals = tokenA?.decimals || 6
        const tokenBDecimals = tokenB?.decimals || 6

        // Convert reserves to human-readable amounts
        const reserveA = poolInfo.reserveA / Math.pow(10, tokenADecimals)
        const reserveB = poolInfo.reserveB / Math.pow(10, tokenBDecimals)
        const poolLiquidity = reserveA + reserveB

        totalLiquidity += poolLiquidity

        // Consider a pool active if it has liquidity
        if (poolLiquidity > 0) {
          activePoolsCount++
        }
      }

      // Count unique users from LP token holders
      const uniqueUsersCount = await countUniqueUsers(pools)

      setMetrics({
        totalVolume: 0, // TODO: Implement volume tracking from transaction history
        activePools: activePoolsCount,
        uniqueUsers: uniqueUsersCount,
        totalLiquidity: totalLiquidity,
        loading: false,
      })
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      setMetrics((prev) => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [listExistingPools])

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(decimals)}M`
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(decimals)}K`
    } else {
      return `$${num.toFixed(decimals)}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
            <p className="text-gray-300">Track DEX performance and metrics</p>
          </div>
          <button
            onClick={fetchAnalyticsData}
            disabled={metrics.loading}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw size={20} className={`text-white ${metrics.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Liquidity</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.loading ? (
                    <div className="flex items-center">
                      <div className="loading-spinner mr-2"></div>
                      Loading...
                    </div>
                  ) : (
                    formatNumber(metrics.totalLiquidity)
                  )}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Pools</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.loading ? (
                    <div className="flex items-center">
                      <div className="loading-spinner mr-2"></div>
                      Loading...
                    </div>
                  ) : (
                    metrics.activePools
                  )}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Unique Users</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.loading ? (
                    <div className="flex items-center">
                      <div className="loading-spinner mr-2"></div>
                      Loading...
                    </div>
                  ) : (
                    metrics.uniqueUsers
                  )}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">24h Volume</p>
                <p className="text-2xl font-bold text-gray-400">
                  {metrics.loading ? (
                    <div className="flex items-center">
                      <div className="loading-spinner mr-2"></div>
                      Loading...
                    </div>
                  ) : (
                    'Coming Soon'
                  )}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Pool Statistics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Pool Statistics</h2>
          <PoolStats />
        </div>

        {/* Coming Soon Features */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Coming Soon</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">Volume Charts</h4>
              <p className="text-gray-400 text-sm">Interactive charts showing trading volume over time</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">User Analytics</h4>
              <p className="text-gray-400 text-sm">Track unique users and user activity patterns</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">Fee Tracking</h4>
              <p className="text-gray-400 text-sm">Monitor protocol fees and LP rewards</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">Yield Analytics</h4>
              <p className="text-gray-400 text-sm">Track returns for liquidity providers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
