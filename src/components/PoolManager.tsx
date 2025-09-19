import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Plus, Minus, DollarSign } from 'lucide-react';
import TokenSelector from './TokenSelector';
import { TOKENS } from '../constants/tokens';
import { useMiniDex } from '../hooks/useMiniDex';

const PoolManager: React.FC = () => {
  const { publicKey } = useWallet();
  const { initializePool, addLiquidity, removeLiquidity } = useMiniDex();

  const [activeTab, setActiveTab] = useState<'create' | 'add' | 'remove'>('add');
  const [tokenA, setTokenA] = useState(TOKENS[0]);
  const [tokenB, setTokenB] = useState(TOKENS[1]);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [lpTokens, setLpTokens] = useState('');
  const [feeRate, setFeeRate] = useState('30'); // 0.3% default
  const [isLoading, setIsLoading] = useState(false);

  const handleCreatePool = async () => {
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      const fee = parseInt(feeRate);
      if (fee < 0 || fee > 1000) {
        alert('Fee rate must be between 0 and 1000 basis points (0-10%)');
        return;
      }

      const signature = await initializePool(tokenA.mint, tokenB.mint, fee);
      if (signature) {
        alert(`Pool created successfully! Transaction: ${signature}`);
      }
    } catch (error) {
      console.error('Pool creation failed:', error);
      alert('Pool creation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!publicKey || !amountA || !amountB) {
      alert('Please connect your wallet and enter amounts');
      return;
    }

    setIsLoading(true);
    try {
      const inputAmountA = parseFloat(amountA) * Math.pow(10, tokenA.decimals);
      const inputAmountB = parseFloat(amountB) * Math.pow(10, tokenB.decimals);

      const signature = await addLiquidity(
        tokenA.mint,
        tokenB.mint,
        inputAmountA,
        inputAmountB,
        0 // Minimum LP tokens (could be calculated for slippage protection)
      );

      if (signature) {
        alert(`Liquidity added successfully! Transaction: ${signature}`);
        setAmountA('');
        setAmountB('');
      }
    } catch (error) {
      console.error('Add liquidity failed:', error);
      alert('Add liquidity failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!publicKey || !lpTokens) {
      alert('Please connect your wallet and enter LP token amount');
      return;
    }

    setIsLoading(true);
    try {
      const lpAmount = parseFloat(lpTokens) * Math.pow(10, 6); // LP tokens have 6 decimals

      const signature = await removeLiquidity(
        tokenA.mint,
        tokenB.mint,
        lpAmount,
        0, // Minimum amount A
        0  // Minimum amount B
      );

      if (signature) {
        alert(`Liquidity removed successfully! Transaction: ${signature}`);
        setLpTokens('');
      }
    } catch (error) {
      console.error('Remove liquidity failed:', error);
      alert('Remove liquidity failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const TabButton = ({ 
    tab, 
    icon, 
    label 
  }: { 
    tab: 'create' | 'add' | 'remove'; 
    icon: React.ReactNode; 
    label: string; 
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        activeTab === tab
          ? 'bg-purple-600 text-white shadow-lg'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-2">
        <TabButton
          tab="create"
          icon={<Plus size={16} />}
          label="Create"
        />
        <TabButton
          tab="add"
          icon={<Plus size={16} />}
          label="Add"
        />
        <TabButton
          tab="remove"
          icon={<Minus size={16} />}
          label="Remove"
        />
      </div>

      {/* Create Pool Tab */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Token A
              </label>
              <TokenSelector
                selectedToken={tokenA}
                onTokenSelect={setTokenA}
                excludeToken={tokenB}
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Token B
              </label>
              <TokenSelector
                selectedToken={tokenB}
                onTokenSelect={setTokenB}
                excludeToken={tokenA}
              />
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">
              Fee Rate (basis points)
            </label>
            <input
              type="number"
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              className="dex-input"
              placeholder="30 (0.3%)"
              min="0"
              max="1000"
            />
            <p className="text-xs text-gray-400 mt-1">
              1 basis point = 0.01%. Example: 30 = 0.3%, 100 = 1%
            </p>
          </div>

          <button
            onClick={handleCreatePool}
            disabled={!publicKey || isLoading}
            className="w-full dex-button dex-button-primary py-3"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner"></div>
                <span>Creating Pool...</span>
              </div>
            ) : (
              'Create Pool'
            )}
          </button>
        </div>
      )}

      {/* Add Liquidity Tab */}
      {activeTab === 'add' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Token A
              </label>
              <TokenSelector
                selectedToken={tokenA}
                onTokenSelect={setTokenA}
                excludeToken={tokenB}
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Token B
              </label>
              <TokenSelector
                selectedToken={tokenB}
                onTokenSelect={setTokenB}
                excludeToken={tokenA}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                {tokenA.symbol} Amount
              </label>
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="dex-input"
                placeholder="0.0"
                step="any"
              />
              <p className="text-xs text-gray-400 mt-1">
                Balance: {tokenA.balance?.toFixed(4) || '0.0000'} {tokenA.symbol}
              </p>
            </div>

            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                {tokenB.symbol} Amount
              </label>
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="dex-input"
                placeholder="0.0"
                step="any"
              />
              <p className="text-xs text-gray-400 mt-1">
                Balance: {tokenB.balance?.toFixed(4) || '0.0000'} {tokenB.symbol}
              </p>
            </div>
          </div>

          <button
            onClick={handleAddLiquidity}
            disabled={!publicKey || !amountA || !amountB || isLoading}
            className="w-full dex-button dex-button-success py-3"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner"></div>
                <span>Adding Liquidity...</span>
              </div>
            ) : (
              'Add Liquidity'
            )}
          </button>
        </div>
      )}

      {/* Remove Liquidity Tab */}
      {activeTab === 'remove' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Token A
              </label>
              <TokenSelector
                selectedToken={tokenA}
                onTokenSelect={setTokenA}
                excludeToken={tokenB}
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Token B
              </label>
              <TokenSelector
                selectedToken={tokenB}
                onTokenSelect={setTokenB}
                excludeToken={tokenA}
              />
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">
              LP Tokens to Remove
            </label>
            <input
              type="number"
              value={lpTokens}
              onChange={(e) => setLpTokens(e.target.value)}
              className="dex-input"
              placeholder="0.0"
              step="any"
            />
            <p className="text-xs text-gray-400 mt-1">
              LP Balance: 0.0000 (Connect wallet to see balance)
            </p>
          </div>

          <button
            onClick={handleRemoveLiquidity}
            disabled={!publicKey || !lpTokens || isLoading}
            className="w-full dex-button dex-button-warning py-3"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner"></div>
                <span>Removing Liquidity...</span>
              </div>
            ) : (
              'Remove Liquidity'
            )}
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="message-info">
        <h4 className="font-semibold mb-2">💡 Liquidity Provider Tips</h4>
        <ul className="text-sm space-y-1">
          <li>• Earn fees from every swap in the pool</li>
          <li>• LP tokens represent your share of the pool</li>
          <li>• Be aware of impermanent loss when token prices diverge</li>
          <li>• Remove liquidity anytime by burning LP tokens</li>
        </ul>
      </div>
    </div>
  );
};

export default PoolManager;