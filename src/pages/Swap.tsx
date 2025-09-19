import React from "react";
import { ArrowRightLeft } from "lucide-react";
import SwapInterface from "../components/SwapInterface";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const Swap: React.FC = () => {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <ArrowRightLeft className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Token Swap</h1>
          <p className="text-gray-300 mb-8">
            Connect your wallet to start swapping tokens instantly
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
          <h1 className="text-4xl font-bold text-white mb-2">Swap Tokens</h1>
          <p className="text-gray-300">
            Trade tokens instantly with minimal slippage
          </p>
        </div>

        {/* Swap Interface */}
        <div className="max-w-md mx-auto">
          <SwapInterface />
        </div>

        {/* Trading Info */}
        <div className="mt-12 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <ArrowRightLeft className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Instant Trades
            </h3>
            <p className="text-gray-300 text-sm">
              Execute trades immediately with our automated market maker
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-black font-bold text-sm">%</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Low Fees</h3>
            <p className="text-gray-300 text-sm">
              Competitive trading fees with transparent pricing
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-sm">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Fast Settlement
            </h3>
            <p className="text-gray-300 text-sm">
              Trades settle in seconds on the Solana blockchain
            </p>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">
              ⚠️ Important Notice
            </h3>
            <p className="text-yellow-200 text-sm">
              This is educational software for demonstration purposes. Please
              use testnet tokens only. Always verify token addresses and amounts
              before confirming transactions. Trading cryptocurrencies involves
              risk of loss.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Swap;
