import React, { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Token } from '../types/token'
import { TOKENS } from '../constants/tokens'

interface TokenSelectorProps {
  selectedToken: Token
  onTokenSelect: (token: Token) => void
  excludeToken?: Token
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ selectedToken, onTokenSelect, excludeToken }) => {
  const [isOpen, setIsOpen] = useState(false)

  const availableTokens = TOKENS.filter((token) => !excludeToken || token.mint !== excludeToken.mint)

  // Get token icon based on symbol
  const getTokenIcon = (symbol: string) => {
    const iconMap: { [key: string]: string } = {
      SOL: '☀️',
      TUSDC: '💵',
      TUSDT: '💰',
      TBTC: '₿',
      TETH: 'Ξ',
      MDX: '🪙',
    }
    return iconMap[symbol] || symbol.charAt(0).toUpperCase()
  }

  // Get token color based on symbol
  const getTokenColor = (symbol: string) => {
    const colorMap: { [key: string]: string } = {
      SOL: 'from-purple-500 to-pink-500',
      TUSDC: 'from-blue-500 to-cyan-500',
      TUSDT: 'from-green-500 to-emerald-500',
      TBTC: 'from-orange-500 to-yellow-500',
      TETH: 'from-gray-500 to-slate-500',
      MDX: 'from-indigo-500 to-purple-500',
    }
    return colorMap[symbol] || 'from-purple-500 to-blue-500'
  }

  // Token icon component with fallback
  const TokenImage: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
    const [imageError, setImageError] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    const handleImageError = () => {
      setImageError(true)
    }

    const handleImageLoad = () => {
      setImageLoaded(true)
    }

    // Always show fallback for now since external images have CORS issues
    return <div className={`${className} bg-gradient-to-br ${getTokenColor(alt)} token-icon`}>{getTokenIcon(alt)}</div>
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="token-selector min-w-[120px]">
        <div className="flex items-center space-x-2">
          <TokenImage src={selectedToken.logoURI} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
          <span className="font-semibold text-white">{selectedToken.symbol}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
            {availableTokens.map((token) => (
              <button
                key={token.mint}
                onClick={() => {
                  onTokenSelect(token)
                  setIsOpen(false)
                }}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg"
              >
                <TokenImage src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-white">{token.symbol}</div>
                  <div className="text-sm text-gray-400">{token.name}</div>
                </div>
                {token.balance !== undefined && <div className="text-sm text-gray-300">{token.balance.toFixed(4)}</div>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default TokenSelector
