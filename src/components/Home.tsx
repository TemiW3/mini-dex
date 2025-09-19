import React from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Wallet, ArrowRightLeft, TrendingUp } from 'lucide-react'

const Home: React.FC = () => {
  const { connected } = useWallet()

  if (connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Mini DEX</h1>
            <p className="text-gray-300">Trade tokens seamlessly on Solana</p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <ArrowRightLeft className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Instant Swaps</h3>
              <p className="text-gray-300 text-sm">Trade tokens instantly with minimal slippage</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Best Rates</h3>
              <p className="text-gray-300 text-sm">Get the best exchange rates for your trades</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <Wallet className="w-8 h-8 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Secure</h3>
              <p className="text-gray-300 text-sm">Non-custodial trading directly from your wallet</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Logo/Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <ArrowRightLeft className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Mini DEX</h1>
          <p className="text-xl text-gray-300 mb-8">Your gateway to decentralized trading on Solana</p>
        </div>

        {/* Features */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <span>Instant token swaps</span>
          </div>
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span>Competitive rates</span>
          </div>
          <div className="flex items-center justify-center space-x-3 text-gray-300">
            <Wallet className="w-5 h-5 text-purple-400" />
            <span>Non-custodial & secure</span>
          </div>
        </div>

        {/* Connect Wallet Button */}
        <div className="mb-8">
          <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-blue-500 !rounded-xl !py-4 !px-8 !text-lg !font-semibold !transition-all !duration-300 hover:!scale-105 hover:!shadow-lg" />
        </div>

        {/* Additional Info */}
        <div className="text-gray-400 text-sm">
          <p className="mb-2">Connect your Solana wallet to start trading</p>
          <p>Supported wallets: Phantom, Solflare, and more</p>
        </div>
      </div>
    </div>
  )
}

export default Home
