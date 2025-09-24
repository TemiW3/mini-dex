import React, { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { Plus, Minus, CheckCircle, RefreshCw } from 'lucide-react'
import TokenSelector from './TokenSelector'
import { TOKENS } from '../constants/tokens'
import { useMiniDex } from '../hooks/useMiniDex'

const PoolManager: React.FC = () => {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const {
    initializePool,
    initializeVaultA,
    initializeVaultB,
    initializeLpMint,
    addLiquidity,
    removeLiquidity,
    poolExists,
    getPoolInfo,
  } = useMiniDex()

  const [activeTab, setActiveTab] = useState<'create' | 'add' | 'remove'>('add')
  const [tokenA, setTokenA] = useState(TOKENS[0])
  const [tokenB, setTokenB] = useState(TOKENS[1])
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [lpTokens, setLpTokens] = useState('')
  const [feeRate, setFeeRate] = useState('30') // 0.3% default
  const [isLoading, setIsLoading] = useState(false)
  const [poolExistsState, setPoolExistsState] = useState<boolean | null>(null)
  const [tokenABalance, setTokenABalance] = useState<number>(0)
  const [tokenBBalance, setTokenBBalance] = useState<number>(0)
  const [lpTokenBalance, setLpTokenBalance] = useState<number>(0)

  // Function to fetch token balances
  const fetchTokenBalances = async () => {
    if (!publicKey) {
      setTokenABalance(0)
      setTokenBBalance(0)
      setLpTokenBalance(0)
      return
    }

    try {
      // Fetch Token A balance
      if (tokenA.mint === 'So11111111111111111111111111111111111111112') {
        // SOL balance
        const solBalance = await connection.getBalance(publicKey)
        setTokenABalance(solBalance / 1e9) // Convert lamports to SOL
      } else {
        // Token balance
        const tokenAAccount = await getAssociatedTokenAddress(new PublicKey(tokenA.mint), publicKey)
        try {
          const tokenABalanceInfo = await connection.getTokenAccountBalance(tokenAAccount)
          setTokenABalance(parseFloat(tokenABalanceInfo.value.uiAmountString || '0'))
        } catch (error) {
          setTokenABalance(0)
        }
      }

      // Fetch Token B balance
      if (tokenB.mint === 'So11111111111111111111111111111111111111112') {
        // SOL balance
        const solBalance = await connection.getBalance(publicKey)
        setTokenBBalance(solBalance / 1e9) // Convert lamports to SOL
      } else {
        // Token balance
        const tokenBAccount = await getAssociatedTokenAddress(new PublicKey(tokenB.mint), publicKey)
        try {
          const tokenBBalanceInfo = await connection.getTokenAccountBalance(tokenBAccount)
          setTokenBBalance(parseFloat(tokenBBalanceInfo.value.uiAmountString || '0'))
        } catch (error) {
          setTokenBBalance(0)
        }
      }

      // Fetch LP token balance if pool exists
      if (poolExistsState) {
        try {
          const poolInfo = await getPoolInfo(tokenA.mint, tokenB.mint)
          if (poolInfo) {
            const lpTokenAccount = await getAssociatedTokenAddress(new PublicKey(poolInfo.lpMint), publicKey)
            try {
              const lpBalanceInfo = await connection.getTokenAccountBalance(lpTokenAccount)
              setLpTokenBalance(parseFloat(lpBalanceInfo.value.uiAmountString || '0'))
            } catch (error) {
              setLpTokenBalance(0)
            }
          }
        } catch (error) {
          setLpTokenBalance(0)
        }
      }
    } catch (error) {
      console.error('Error fetching token balances:', error)
      setTokenABalance(0)
      setTokenBBalance(0)
      setLpTokenBalance(0)
    }
  }

  // Check if pool exists when tokens change
  useEffect(() => {
    const checkPoolExists = async () => {
      if (publicKey && tokenA.mint && tokenB.mint) {
        try {
          const exists = await poolExists(tokenA.mint, tokenB.mint)
          setPoolExistsState(exists)
        } catch (error) {
          console.error('Error checking pool existence:', error)
          setPoolExistsState(false)
        }
      } else {
        setPoolExistsState(null)
      }
    }

    checkPoolExists()
  }, [publicKey, tokenA.mint, tokenB.mint, poolExists])

  // Fetch balances when wallet or tokens change
  useEffect(() => {
    fetchTokenBalances()
  }, [publicKey, tokenA.mint, tokenB.mint, poolExistsState, getPoolInfo])

  // Pool initialization state
  const [initStep, setInitStep] = useState(0)
  const [initSteps, setInitSteps] = useState<Array<{ name: string; completed: boolean; tx: string | null }>>([
    { name: 'Create Pool', completed: false, tx: null },
    { name: 'Initialize Vault A', completed: false, tx: null },
    { name: 'Initialize Vault B', completed: false, tx: null },
    { name: 'Initialize LP Mint', completed: false, tx: null },
  ])

  const handleCreatePool = async () => {
    if (!publicKey) {
      alert('Please connect your wallet')
      return
    }

    const fee = parseInt(feeRate)
    if (fee < 0 || fee > 1000) {
      alert('Fee rate must be between 0 and 1000 basis points (0-10%)')
      return
    }

    setIsLoading(true)
    setInitStep(0)

    // Reset steps
    setInitSteps([
      { name: 'Create Pool', completed: false, tx: null },
      { name: 'Initialize Vault A', completed: false, tx: null },
      { name: 'Initialize Vault B', completed: false, tx: null },
      { name: 'Initialize LP Mint', completed: false, tx: null },
    ])

    try {
      // Step 1: Create Pool
      setInitStep(1)
      const poolTx = await initializePool(tokenA.mint, tokenB.mint, fee)
      if (!poolTx) throw new Error('Failed to create pool')

      setInitSteps((prev) => prev.map((step, i) => (i === 0 ? { ...step, completed: true, tx: poolTx } : step)))

      // Step 2: Initialize Vault A
      setInitStep(2)
      const vaultATx = await initializeVaultA(tokenA.mint, tokenB.mint)
      if (!vaultATx) throw new Error('Failed to initialize vault A')

      setInitSteps((prev) => prev.map((step, i) => (i === 1 ? { ...step, completed: true, tx: vaultATx } : step)))

      // Step 3: Initialize Vault B
      setInitStep(3)
      const vaultBTx = await initializeVaultB(tokenA.mint, tokenB.mint)
      if (!vaultBTx) throw new Error('Failed to initialize vault B')

      setInitSteps((prev) => prev.map((step, i) => (i === 2 ? { ...step, completed: true, tx: vaultBTx } : step)))

      // Step 4: Initialize LP Mint
      setInitStep(4)
      const lpMintTx = await initializeLpMint(tokenA.mint, tokenB.mint)
      if (!lpMintTx) throw new Error('Failed to initialize LP mint')

      setInitSteps((prev) => prev.map((step, i) => (i === 3 ? { ...step, completed: true, tx: lpMintTx } : step)))

      alert(`Pool created successfully! All transactions completed.`)
      setInitStep(0)
    } catch (error) {
      console.error('Pool creation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Pool creation failed at step ${initStep}: ${errorMessage}`)
      setInitStep(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddLiquidity = async () => {
    if (!publicKey || !amountA || !amountB) {
      alert('Please connect your wallet and enter amounts')
      return
    }

    const inputAmountA = parseFloat(amountA)
    const inputAmountB = parseFloat(amountB)

    if (isNaN(inputAmountA) || isNaN(inputAmountB) || inputAmountA <= 0 || inputAmountB <= 0) {
      alert('Please enter valid amounts greater than 0')
      return
    }

    setIsLoading(true)
    try {
      const signature = await addLiquidity(
        tokenA.mint,
        tokenB.mint,
        inputAmountA,
        inputAmountB,
        0, // Minimum LP tokens (could be calculated for slippage protection)
        tokenA.decimals,
        tokenB.decimals,
      )

      if (signature) {
        alert(`Liquidity added successfully! Transaction: ${signature}`)
        setAmountA('')
        setAmountB('')
        // Refresh balances after successful transaction
        await fetchTokenBalances()
      }
    } catch (error) {
      console.error('Add liquidity failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Add liquidity failed: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveLiquidity = async () => {
    if (!publicKey || !lpTokens) {
      alert('Please connect your wallet and enter LP token amount')
      return
    }

    const lpAmount = parseFloat(lpTokens)
    if (isNaN(lpAmount) || lpAmount <= 0) {
      alert('Please enter a valid LP token amount greater than 0')
      return
    }

    setIsLoading(true)
    try {
      const signature = await removeLiquidity(
        tokenA.mint,
        tokenB.mint,
        lpAmount,
        0, // Minimum amount A
        0, // Minimum amount B
        tokenA.decimals,
        tokenB.decimals,
      )

      if (signature) {
        alert(`Liquidity removed successfully! Transaction: ${signature}`)
        setLpTokens('')
      }
    } catch (error) {
      console.error('Remove liquidity failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Remove liquidity failed: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const TabButton = ({
    tab,
    icon,
    label,
  }: {
    tab: 'create' | 'add' | 'remove'
    icon: React.ReactNode
    label: string
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        activeTab === tab ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-2">
        <TabButton tab="create" icon={<Plus size={16} />} label="Create" />
        <TabButton tab="add" icon={<Plus size={16} />} label="Add" />
        <TabButton tab="remove" icon={<Minus size={16} />} label="Remove" />
      </div>

      {/* Create Pool Tab */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Token A</label>
              <TokenSelector selectedToken={tokenA} onTokenSelect={setTokenA} excludeToken={tokenB} />
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Token B</label>
              <TokenSelector selectedToken={tokenB} onTokenSelect={setTokenB} excludeToken={tokenA} />
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">Fee Rate (basis points)</label>
            <input
              type="number"
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              className="dex-input"
              placeholder="30 (0.3%)"
              min="0"
              max="1000"
            />
            <p className="text-xs text-gray-400 mt-1">1 basis point = 0.01%. Example: 30 = 0.3%, 100 = 1%</p>
          </div>

          {/* Initialization Progress */}
          {isLoading && initStep > 0 && (
            <div className="bg-gray-700 rounded-lg p-4 space-y-3">
              <h4 className="text-white font-semibold">Pool Initialization Progress</h4>
              {initSteps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : index + 1 === initStep
                          ? 'bg-blue-500 text-white animate-pulse'
                          : 'bg-gray-600 text-gray-400'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle size={16} />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      step.completed ? 'text-green-400' : index + 1 === initStep ? 'text-blue-400' : 'text-gray-400'
                    }`}
                  >
                    {step.name}
                  </span>
                  {step.completed && step.tx && (
                    <span className="text-xs text-gray-500 ml-auto">✓ {step.tx.slice(0, 8)}...</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleCreatePool}
            disabled={!publicKey || isLoading}
            className="w-full dex-button dex-button-primary py-3"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner"></div>
                <span>
                  {initStep === 0
                    ? 'Starting...'
                    : initStep === 1
                      ? 'Creating Pool...'
                      : initStep === 2
                        ? 'Initializing Vault A...'
                        : initStep === 3
                          ? 'Initializing Vault B...'
                          : initStep === 4
                            ? 'Initializing LP Mint...'
                            : 'Finalizing...'}
                </span>
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
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">Token A</label>
                <TokenSelector selectedToken={tokenA} onTokenSelect={setTokenA} excludeToken={tokenB} />
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">Token B</label>
                <TokenSelector selectedToken={tokenB} onTokenSelect={setTokenB} excludeToken={tokenA} />
              </div>
            </div>
            <button
              onClick={fetchTokenBalances}
              className="ml-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Refresh balances"
            >
              <RefreshCw size={16} className="text-gray-300" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">{tokenA.symbol} Amount</label>
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="dex-input"
                placeholder="0.0"
                step="any"
              />
              <p className="text-xs text-gray-400 mt-1">
                Balance: {tokenABalance.toFixed(4)} {tokenA.symbol}
              </p>
            </div>

            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">{tokenB.symbol} Amount</label>
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="dex-input"
                placeholder="0.0"
                step="any"
              />
              <p className="text-xs text-gray-400 mt-1">
                Balance: {tokenBBalance.toFixed(4)} {tokenB.symbol}
              </p>
            </div>
          </div>

          {/* Pool Status */}
          {poolExistsState !== null && (
            <div
              className={`p-3 rounded-lg ${
                poolExistsState
                  ? 'bg-green-900/20 border border-green-500/30'
                  : 'bg-yellow-900/20 border border-yellow-500/30'
              }`}
            >
              <p className={`text-sm ${poolExistsState ? 'text-green-400' : 'text-yellow-400'}`}>
                {poolExistsState
                  ? '✅ Pool exists - You can add liquidity'
                  : '⚠️ Pool does not exist - Create the pool first'}
              </p>
            </div>
          )}

          <button
            onClick={handleAddLiquidity}
            disabled={!publicKey || !amountA || !amountB || isLoading || !poolExistsState}
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
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">Token A</label>
                <TokenSelector selectedToken={tokenA} onTokenSelect={setTokenA} excludeToken={tokenB} />
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">Token B</label>
                <TokenSelector selectedToken={tokenB} onTokenSelect={setTokenB} excludeToken={tokenA} />
              </div>
            </div>
            <button
              onClick={fetchTokenBalances}
              className="ml-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Refresh balances"
            >
              <RefreshCw size={16} className="text-gray-300" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">{tokenA.symbol} Balance</label>
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-white font-semibold">
                  {tokenABalance.toFixed(4)} {tokenA.symbol}
                </p>
              </div>
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">{tokenB.symbol} Balance</label>
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-white font-semibold">
                  {tokenBBalance.toFixed(4)} {tokenB.symbol}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm font-medium mb-2 block">LP Tokens to Remove</label>
            <input
              type="number"
              value={lpTokens}
              onChange={(e) => setLpTokens(e.target.value)}
              className="dex-input"
              placeholder="0.0"
              step="any"
            />
            <p className="text-xs text-gray-400 mt-1">LP Balance: {lpTokenBalance.toFixed(4)} LP Tokens</p>
          </div>

          <button
            onClick={handleRemoveLiquidity}
            disabled={!publicKey || !lpTokens || isLoading || !poolExistsState}
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
  )
}

export default PoolManager
