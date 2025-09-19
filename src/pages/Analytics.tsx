import React from "react";
import { TrendingUp, Activity, DollarSign, Users } from "lucide-react";
import PoolStats from "../components/PoolStats";

const Analytics: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-gray-300">Track DEX performance and metrics</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Volume</p>
                <p className="text-2xl font-bold text-white">$1.2M</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Pools</p>
                <p className="text-2xl font-bold text-white">8</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">1,543</p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">24h Change</p>
                <p className="text-2xl font-bold text-green-400">+12.5%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Pool Statistics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            Pool Statistics
          </h2>
          <PoolStats />
        </div>

        {/* Coming Soon Features */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Coming Soon</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">
                Volume Charts
              </h4>
              <p className="text-gray-400 text-sm">
                Interactive charts showing trading volume over time
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">
                Price History
              </h4>
              <p className="text-gray-400 text-sm">
                Historical price data for all token pairs
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">
                Liquidity Tracking
              </h4>
              <p className="text-gray-400 text-sm">
                Monitor liquidity changes across pools
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-2">
                Yield Analytics
              </h4>
              <p className="text-gray-400 text-sm">
                Track returns for liquidity providers
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
