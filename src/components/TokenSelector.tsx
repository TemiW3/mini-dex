import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Token } from '../types/token';
import { TOKENS } from '../constants/tokens';

interface TokenSelectorProps {
  selectedToken: Token;
  onTokenSelect: (token: Token) => void;
  excludeToken?: Token;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onTokenSelect,
  excludeToken,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const availableTokens = TOKENS.filter(
    (token) => !excludeToken || token.mint !== excludeToken.mint
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="token-selector min-w-[120px]"
      >
        <div className="flex items-center space-x-2">
          <img
            src={selectedToken.logoURI}
            alt={selectedToken.name}
            className="w-6 h-6 rounded-full"
          />
          <span className="font-semibold text-white">{selectedToken.symbol}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
            {availableTokens.map((token) => (
              <button
                key={token.mint}
                onClick={() => {
                  onTokenSelect(token);
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-700 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg"
              >
                <img
                  src={token.logoURI}
                  alt={token.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-white">{token.symbol}</div>
                  <div className="text-sm text-gray-400">{token.name}</div>
                </div>
                {token.balance !== undefined && (
                  <div className="text-sm text-gray-300">
                    {token.balance.toFixed(4)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TokenSelector;