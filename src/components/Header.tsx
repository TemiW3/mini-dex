import React from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { Link, useLocation } from 'react-router-dom'

const Header: React.FC = () => {
  const { publicKey, connected } = useWallet()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <Link to="/" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
            <div className="text-3xl">🚀</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Mini DEX</h1>
              <p className="text-sm text-gray-400">Solana AMM</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/swap"
              className={`transition-colors duration-200 ${
                isActive('/swap') ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Swap
            </Link>
            <Link
              to="/pools"
              className={`transition-colors duration-200 ${
                isActive('/pools') ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Pools
            </Link>
            <Link
              to="/analytics"
              className={`transition-colors duration-200 ${
                isActive('/analytics') ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Analytics
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {connected && publicKey && (
              <div className="hidden sm:flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">
                  {publicKey.toString().slice(0, 4)}...
                  {publicKey.toString().slice(-4)}
                </span>
              </div>
            )}
            <WalletMultiButton />
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden mt-4 flex justify-center space-x-6">
          <Link
            to="/swap"
            className={`transition-colors duration-200 text-sm ${
              isActive('/swap') ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            Swap
          </Link>
          <Link
            to="/pools"
            className={`transition-colors duration-200 text-sm ${
              isActive('/pools') ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            Pools
          </Link>
          <Link
            to="/analytics"
            className={`transition-colors duration-200 text-sm ${
              isActive('/analytics') ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            Analytics
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
