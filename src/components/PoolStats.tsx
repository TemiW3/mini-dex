import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Percent, Users } from 'lucide-react';
import { TOKENS } from '../constants/tokens';
import { useMiniDex } from '../hooks/useMiniDex';

interface PoolData {
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  totalLiquidity: number;
  volume24h: number;
  fees24h: number;
  feeRate: number;
  price: number;
  priceChange24h: number;
}

const PoolStats: React.FC = () => {
  const { getPoolInfo } = useMiniDex();
  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<string>('');

  useEffect(() => {
    loadPoolData();
  }, []);

  const loadPoolData = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration - in real app, fetch from blockchain
      const mockPools: PoolData[] = [
        {
          tokenA: 'SOL',
          tokenB: 'USDC',
          reserveA: 1250.5,
          reserveB: 125000.25,
          totalLiquidity: 250000.5,
          volume24h: 50000.75,
          fees24h: 150.25,
          feeRate: 0.3,
          price: 100.02,
          priceChange24h: 2.5,
        },
        {
          tokenA: 'RAY',
          tokenB: 'USDC',
          reserveA: 25000.0,
          reserveB: 50000.0,
          totalLiquidity: 100000.0,
          volume24h: 25000.0,
          fees24h: 75.0,
          feeRate: 0.3,
          price: 2.0,
          priceChange24h: -1.2,
        },
        {
          tokenA: 'ORCA',
          tokenB: 'SOL',
          reserveA: 10000.0,
          reserveB: 100.0,
          totalLiquidity: 20000.0,
          volume24h: 10000.0,
          fees24h: 30.0,
          feeRate: 0.3,
          price: 0.01,
          priceChange24h: 5.8,
        },
      ];

      setPools(mockPools);
      if (mockPools.length > 0) {
        setSelectedPool(`${mockPools[0].tokenA}-${mockPools[0].tokenB}`);
      }
    } catch (error) {
      console.error('Error loading pool data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(decimals)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(decimals)}K`;
    } else {
      return `$${num.toFixed(decimals)}`;
    }
  };

  const getPriceChangeColor = (change: number): string => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const StatCard = ({ 
    icon, 
    label, 
    value, 
    change, 
    color = 'text-white' 
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    change?: string;
    color?: string;
  }) => (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-400">{icon}</div>
        {change && (
          <span className={`text-sm ${getPriceChangeColor(parseFloat(change))}`}>
            {parseFloat(change) >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="loading-spinner mr-3"></div>
        <span className="text-gray-400">Loading pool data...</span>
      </div>
    );
  }

  const selectedPoolData = pools.find(
    pool => `${pool.tokenA}-${pool.tokenB}` === selectedPool
  );

  return (
    <div className="space-y-6">
      {/* Pool Selector */}
      <div className="flex flex-wrap gap-2">
        {pools.map((pool) => {
          const poolKey = `${pool.tokenA}-${pool.tokenB}`;
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
          );
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
            <StatCard
              icon={<Percent size={20} />}
              label="24h Fees"
              value={formatNumber(selectedPoolData.fees24h)}
            />
            <StatCard
              icon={<Users size={20} />}
              label="Price"
              value={`$${selectedPoolData.price.toFixed(4)}`}
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
                        {selectedPoolData.reserveA.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">{selectedPoolData.tokenB}</span>
                      <span className="text-white font-semibold">
                        {selectedPoolData.reserveB.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Fee Rate</p>
                  <p className="text-white font-semibold">{selectedPoolData.feeRate}%</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Pool Ratio</p>
                  <div className="text-white font-semibold">
                    1 {selectedPoolData.tokenA} = {selectedPoolData.price.toFixed(4)} {selectedPoolData.tokenB}
                  </div>
                  <div className="text-gray-300">
                    1 {selectedPoolData.tokenB} = {(1/selectedPoolData.price).toFixed(6)} {selectedPoolData.tokenA}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">24h Performance</p>
                  <div className={`font-semibold ${getPriceChangeColor(selectedPoolData.priceChange24h)}`}>
                    {selectedPoolData.priceChange24h >= 0 ? '+' : ''}{selectedPoolData.priceChange24h}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pool Actions */}
          <div className="flex flex-wrap gap-4">
            <button className="dex-button dex-button-primary">
              Add Liquidity
            </button>
            <button className="dex-button dex-button-secondary">
              Remove Liquidity
            </button>
            <button className="dex-button dex-button-secondary">
              Swap Tokens
            </button>
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
                    <div className="text-gray-400 text-xs">
                      Fee: {pool.feeRate}%
                    </div>
                  </td>
                  <td className="text-right py-4 text-white">
                    {formatNumber(pool.totalLiquidity)}
                  </td>
                  <td className="text-right py-4 text-white">
                    {formatNumber(pool.volume24h)}
                  </td>
                  <td className="text-right py-4 text-white">
                    {formatNumber(pool.fees24h)}
                  </td>
                  <td className="text-right py-4 text-white">
                    ${pool.price.toFixed(4)}
                  </td>
                  <td className={`text-right py-4 ${getPriceChangeColor(pool.priceChange24h)}`}>
                    {pool.priceChange24h >= 0 ? '+' : ''}{pool.priceChange24h}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PoolStats;