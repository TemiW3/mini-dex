import React from "react";
import { Plus } from "lucide-react";
import PoolManager from "../components/PoolManager";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const Pools: React.FC = () => {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Manage Pools</h1>
          <p className="text-gray-300 mb-8">
            Connect your wallet to create and manage liquidity pools
          </p>
          <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-blue-500 !rounded-xl !py-3 !px-6 !text-lg !font-semibold" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Liquidity Pools
          </h1>
          <p className="text-gray-300">Create and manage liquidity pools</p>
        </div>

        {/* Pool Manager */}
        <div className="max-w-4xl mx-auto">
          <PoolManager />
        </div>

        {/* Info Section */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              About Liquidity Pools
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  How it works
                </h4>
                <p className="text-gray-300 text-sm">
                  Liquidity pools are pairs of tokens that enable decentralized
                  trading. When you provide liquidity, you deposit both tokens
                  in equal value and receive LP tokens representing your share
                  of the pool.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Earning Fees
                </h4>
                <p className="text-gray-300 text-sm">
                  As a liquidity provider, you earn trading fees proportional to
                  your share of the pool. Fees are automatically reinvested into
                  the pool, increasing your LP token value over time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pools;
