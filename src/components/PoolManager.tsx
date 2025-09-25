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
  const [poolRatio, setPoolRatio] = useState<{ ratio: number; tokenA: string; tokenB: string } | null>(null)
  const [ratioError, setRatioError] = useState<string>('')
  const [calculatedLpTokens, setCalculatedLpTokens] = useState<number>(0)
  const [actualAmounts, setActualAmounts] = useState<{ amountA: number; amountB: number } | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmData, setConfirmData] = useState<{
    inputAmountA: number
    inputAmountB: number
    actualAmountA: number
    actualAmountB: number
    lpTokens: number
  } | null>(null)
  const [deployerAddress, setDeployerAddress] = useState<string | null>(null)
  const [isCheckingDeployer, setIsCheckingDeployer] = useState(false)

  // Check if current user can create pools
  const canCreatePools = deployerAddress && publicKey?.toString() === deployerAddress

  // Function to check if user can create pools
  const checkPoolCreationPermission = async () => {
    if (isCheckingDeployer) return

    setIsCheckingDeployer(true)
    try {
      // SECURE APPROACH: Only allow the actual deployer to create pools
      // For now, we'll use the known deployer address
      // In production, you should implement proper authority checking in the Rust program
      const knownDeployer = '5vvn1eC8WqXXmpyhQKRqzBA8Aov2ceMCWfrTbN1ugYrs'
      setDeployerAddress(knownDeployer)
    } catch (error) {
      console.error('Error checking pool creation permission:', error)
      setDeployerAddress(null) // Default to NOT allowing creation if we can't check
    } finally {
      setIsCheckingDeployer(false)
    }
  }

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
        // SOL balance (native + wrapped)
        const nativeSolBalance = await connection.getBalance(publicKey)
        const nativeSol = nativeSolBalance / 1e9 // Convert lamports to SOL

        // Get wrapped SOL balance
        const wrappedSolAccount = await getAssociatedTokenAddress(new PublicKey(tokenA.mint), publicKey)
        let wrappedSol = 0
        try {
          const wrappedSolBalanceInfo = await connection.getTokenAccountBalance(wrappedSolAccount)
          wrappedSol = parseFloat(wrappedSolBalanceInfo.value.uiAmountString || '0')
        } catch (error) {
          // Wrapped SOL account doesn't exist, wrapped balance is 0
        }

        setTokenABalance(nativeSol + wrappedSol)
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
        // SOL balance (native + wrapped)
        const nativeSolBalance = await connection.getBalance(publicKey)
        const nativeSol = nativeSolBalance / 1e9 // Convert lamports to SOL

        // Get wrapped SOL balance
        const wrappedSolAccount = await getAssociatedTokenAddress(new PublicKey(tokenB.mint), publicKey)
        let wrappedSol = 0
        try {
          const wrappedSolBalanceInfo = await connection.getTokenAccountBalance(wrappedSolAccount)
          wrappedSol = parseFloat(wrappedSolBalanceInfo.value.uiAmountString || '0')
        } catch (error) {
          // Wrapped SOL account doesn't exist, wrapped balance is 0
        }

        setTokenBBalance(nativeSol + wrappedSol)
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

  // Function to fetch pool ratio for existing pools
  const fetchPoolRatio = async () => {
    if (!poolExistsState || !tokenA.mint || !tokenB.mint) {
      setPoolRatio(null)
      setRatioError('')
      return
    }

    try {
      const poolInfo = await getPoolInfo(tokenA.mint, tokenB.mint)
      if (poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0) {
        // Calculate the ratio (tokenB per tokenA)
        const reserveA = poolInfo.reserveA / Math.pow(10, tokenA.decimals)
        const reserveB = poolInfo.reserveB / Math.pow(10, tokenB.decimals)
        const ratio = reserveB / reserveA

        setPoolRatio({
          ratio,
          tokenA: tokenA.symbol,
          tokenB: tokenB.symbol,
        })
        setRatioError('')
      } else {
        setPoolRatio(null)
        setRatioError('')
      }
    } catch (error) {
      console.error('Error fetching pool ratio:', error)
      setPoolRatio(null)
      setRatioError('')
    }
  }

  // Check pool creation permission when component mounts
  useEffect(() => {
    checkPoolCreationPermission()
  }, [connection])

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

  // Fetch pool ratio when pool exists
  useEffect(() => {
    fetchPoolRatio()
  }, [poolExistsState, tokenA.mint, tokenB.mint, getPoolInfo])

  // Validate ratio when amounts change
  useEffect(() => {
    if (amountA && amountB && poolRatio) {
      const inputAmountA = parseFloat(amountA)
      const inputAmountB = parseFloat(amountB)
      if (!isNaN(inputAmountA) && !isNaN(inputAmountB)) {
        validateRatio(inputAmountA, inputAmountB)
      }
    } else {
      setRatioError('')
    }
  }, [amountA, amountB, poolRatio])

  // Calculate LP tokens when amounts change
  useEffect(() => {
    if (amountA && amountB && poolExistsState) {
      const inputAmountA = parseFloat(amountA)
      const inputAmountB = parseFloat(amountB)
      if (!isNaN(inputAmountA) && !isNaN(inputAmountB) && inputAmountA > 0 && inputAmountB > 0) {
        calculateLpTokens(inputAmountA, inputAmountB)
      }
    } else {
      setCalculatedLpTokens(0)
      setActualAmounts(null)
    }
  }, [amountA, amountB, poolExistsState, tokenA.mint, tokenB.mint, getPoolInfo])

  // Function to calculate LP tokens based on backend logic
  const calculateLpTokens = async (amountA: number, amountB: number) => {
    if (!poolExistsState || amountA <= 0 || amountB <= 0) {
      setCalculatedLpTokens(0)
      setActualAmounts(null)
      return { lpTokens: 0, actualAmountA: amountA, actualAmountB: amountB }
    }

    try {
      const poolInfo = await getPoolInfo(tokenA.mint, tokenB.mint)
      if (!poolInfo) {
        setCalculatedLpTokens(0)
        setActualAmounts(null)
        return { lpTokens: 0, actualAmountA: amountA, actualAmountB: amountB }
      }

      const MINIMUM_LIQUIDITY = 1000
      const amountAWithDecimals = amountA * Math.pow(10, tokenA.decimals)
      const amountBWithDecimals = amountB * Math.pow(10, tokenB.decimals)

      let lpTokens: number
      let actualAmountA = amountA
      let actualAmountB = amountB

      if (poolInfo.totalLpSupply === 0) {
        // New pool: LP = sqrt(amount_a * amount_b) - MINIMUM_LIQUIDITY
        const sqrtProduct = Math.sqrt(amountAWithDecimals * amountBWithDecimals)
        lpTokens = Math.max(0, Math.floor(sqrtProduct) - MINIMUM_LIQUIDITY)
      } else {
        // Existing pool: LP = min((amount_a * total_lp_supply) / reserve_a, (amount_b * total_lp_supply) / reserve_b)
        const lpFromA = Math.floor((amountAWithDecimals * poolInfo.totalLpSupply) / poolInfo.reserveA)
        const lpFromB = Math.floor((amountBWithDecimals * poolInfo.totalLpSupply) / poolInfo.reserveB)
        lpTokens = Math.min(lpFromA, lpFromB)

        // Calculate actual amounts that will be used (based on the limiting factor)
        if (lpFromA < lpFromB) {
          // Token A is limiting, adjust Token B amount
          actualAmountB = (lpTokens * poolInfo.reserveB) / poolInfo.totalLpSupply / Math.pow(10, tokenB.decimals)
        } else {
          // Token B is limiting, adjust Token A amount
          actualAmountA = (lpTokens * poolInfo.reserveA) / poolInfo.totalLpSupply / Math.pow(10, tokenA.decimals)
        }
      }

      // Convert LP tokens back to human-readable format (6 decimals)
      const lpTokensHuman = lpTokens / Math.pow(10, 6)

      setCalculatedLpTokens(lpTokensHuman)
      setActualAmounts({ amountA: actualAmountA, amountB: actualAmountB })

      return { lpTokens: lpTokensHuman, actualAmountA, actualAmountB }
    } catch (error) {
      console.error('Error calculating LP tokens:', error)
      setCalculatedLpTokens(0)
      setActualAmounts(null)
      return { lpTokens: 0, actualAmountA: amountA, actualAmountB: amountB }
    }
  }

  // Function to validate ratio and calculate required amount
  const validateRatio = (amountA: number, amountB: number) => {
    if (!poolRatio || amountA <= 0) {
      setRatioError('')
      return { isValid: true, requiredAmountB: 0 }
    }

    const requiredAmountB = amountA * poolRatio.ratio
    const tolerance = 0.01 // 1% tolerance for rounding errors
    const difference = Math.abs(amountB - requiredAmountB)
    const isValid = difference <= requiredAmountB * tolerance

    // Don't show error if we have backend calculation logic that can handle adjustments
    // The backend will automatically adjust amounts to maintain the pool ratio
    if (!isValid) {
      // Only show a warning, not an error, since backend can handle it
      setRatioError(
        `Note: Your amounts don't match the pool ratio. The backend will adjust them to maintain the ratio (1 ${poolRatio.tokenA} = ${poolRatio.ratio.toFixed(6)} ${poolRatio.tokenB}).`,
      )
    } else {
      setRatioError('')
    }

    // Always return valid since backend can handle ratio adjustments
    return { isValid: true, requiredAmountB }
  }

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

    if (!canCreatePools) {
      alert('Only the DEX deployer can create pools')
      return
    }

    const fee = parseInt(feeRate)
    if (fee < 0 || fee > 1000) {
      alert('Fee rate must be between 0 and 1000 basis points (0-10%)')
      return
    }

    // Additional validation
    if (isNaN(fee)) {
      alert('Please enter a valid fee rate')
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

    // Get the actual amounts that will be used (based on backend logic)
    const { actualAmountA, actualAmountB, lpTokens } = await calculateLpTokens(inputAmountA, inputAmountB)

    if (lpTokens <= 0) {
      alert('Calculated LP tokens is 0 or negative. Please check your amounts.')
      return
    }

    // Note: We don't need to validate ratio here since the backend calculation
    // already ensures the amounts are adjusted to maintain the pool ratio

    // Show confirmation modal with actual amounts
    setConfirmData({
      inputAmountA,
      inputAmountB,
      actualAmountA,
      actualAmountB,
      lpTokens,
    })
    setShowConfirmModal(true)
    return // Don't proceed until user confirms in modal
  }

  // Function to execute the actual liquidity addition
  const executeAddLiquidity = async () => {
    if (!confirmData || !publicKey) return

    setShowConfirmModal(false)
    setIsLoading(true)

    try {
      // Calculate minimum LP tokens with 1% slippage tolerance
      const minLpTokens = Math.floor(Math.max(0, confirmData.lpTokens * 0.99)) // 1% slippage tolerance, rounded down

      const signature = await addLiquidity(
        tokenA.mint,
        tokenB.mint,
        confirmData.actualAmountA,
        confirmData.actualAmountB,
        minLpTokens, // Minimum LP tokens with slippage protection
        tokenA.decimals,
        tokenB.decimals,
      )

      if (signature) {
        // Show success modal instead of alert
        setConfirmData({
          ...confirmData,
          // Add success flag to show different modal content
          inputAmountA: -1, // Special flag to indicate success
        })
        setShowConfirmModal(true)
        setAmountA('')
        setAmountB('')
        // Refresh balances after successful transaction
        await fetchTokenBalances()
      }
    } catch (error) {
      console.error('Add liquidity failed:', error)
      // Show error modal instead of alert
      setConfirmData({
        ...confirmData,
        inputAmountA: -2, // Special flag to indicate error
        lpTokens: 0,
      })
      setShowConfirmModal(true)
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
        setConfirmData({
          inputAmountA: -1, // Special flag to indicate success
          inputAmountB: 0,
          actualAmountA: 0,
          actualAmountB: 0,
          lpTokens: 0,
        })
        setShowConfirmModal(true)
        setLpTokens('')
        // Refresh balances after successful transaction
        await fetchTokenBalances()
      }
    } catch (error) {
      setConfirmData({
        inputAmountA: -2, // Special flag to indicate error
        inputAmountB: 0,
        actualAmountA: 0,
        actualAmountB: 0,
        lpTokens: 0,
      })
      setShowConfirmModal(true)
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
  }) => {
    const isCreateTab = tab === 'create'
    const isDisabled = isCreateTab && !canCreatePools

    return (
      <button
        onClick={() => {
          if (!isDisabled) {
            setActiveTab(tab)
          }
        }}
        disabled={isDisabled}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          isDisabled
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
            : activeTab === tab
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title={isDisabled ? 'Only the DEX deployer can create pools' : ''}
      >
        {icon}
        <span>{label}</span>
        {isDisabled && <span className="text-xs">🔒</span>}
        {isCreateTab && isCheckingDeployer && <span className="text-xs">⏳</span>}
      </button>
    )
  }

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
          {/* Security Notice */}
          {!canCreatePools && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🔒</span>
                </div>
                <div>
                  <h3 className="text-red-300 font-semibold">Access Restricted</h3>
                  <p className="text-red-400 text-sm">
                    Only the DEX deployer can create new pools.
                    {deployerAddress && (
                      <span className="block mt-1">
                        Deployer: <span className="font-mono text-xs">{deployerAddress}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {canCreatePools && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <h3 className="text-green-300 font-semibold">Deployer Access Granted</h3>
                  <p className="text-green-400 text-sm">You have permission to create new pools as the DEX deployer.</p>
                </div>
              </div>
            </div>
          )}
          <div className={`grid grid-cols-2 gap-4 ${!canCreatePools ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Token A</label>
              <TokenSelector selectedToken={tokenA} onTokenSelect={setTokenA} excludeToken={tokenB} />
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">Token B</label>
              <TokenSelector selectedToken={tokenB} onTokenSelect={setTokenB} excludeToken={tokenA} />
            </div>
          </div>

          <div className={!canCreatePools ? 'opacity-50 pointer-events-none' : ''}>
            <label className="text-gray-300 text-sm font-medium mb-2 block">Fee Rate (basis points)</label>
            <input
              type="number"
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              className="dex-input"
              placeholder="30 (0.3%)"
              min="0"
              max="1000"
              disabled={!canCreatePools}
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
            disabled={!publicKey || isLoading || !canCreatePools}
            className={`w-full py-3 ${
              !canCreatePools ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'dex-button dex-button-primary'
            }`}
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

          {/* Pool Ratio Information */}
          {poolRatio && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-400 font-semibold mb-2">Pool Ratio Information</h4>
              <p className="text-sm text-blue-300">
                Current ratio:{' '}
                <span className="font-mono">
                  1 {poolRatio.tokenA} = {poolRatio.ratio.toFixed(6)} {poolRatio.tokenB}
                </span>
              </p>
              <p className="text-xs text-blue-400 mt-1">
                Your amounts must maintain this ratio to prevent arbitrage attacks.
              </p>
            </div>
          )}

          {/* LP Token Calculation */}
          {calculatedLpTokens > 0 && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-400 font-semibold mb-2">LP Token Calculation</h4>
              <div className="space-y-2">
                <p className="text-sm text-green-300">
                  You will receive:{' '}
                  <span className="font-mono text-green-200">{calculatedLpTokens.toFixed(6)} LP tokens</span>
                </p>
                {actualAmounts &&
                  (actualAmounts.amountA !== parseFloat(amountA) || actualAmounts.amountB !== parseFloat(amountB)) && (
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                      <p className="text-xs text-green-400 mb-2">Amounts will be adjusted to maintain pool ratio:</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-green-300">
                          {tokenA.symbol}:{' '}
                          <span className="font-mono">
                            {parseFloat(amountA).toFixed(6)} → {actualAmounts.amountA.toFixed(6)}
                          </span>
                        </p>
                        <p className="text-green-300">
                          {tokenB.symbol}:{' '}
                          <span className="font-mono">
                            {parseFloat(amountB).toFixed(6)} → {actualAmounts.amountB.toFixed(6)}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Ratio Warning */}
          {ratioError && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-yellow-400 font-semibold mb-2">ℹ️ Ratio Adjustment</h4>
              <p className="text-sm text-yellow-300">{ratioError}</p>
            </div>
          )}

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
            disabled={!publicKey || !amountA || !amountB || isLoading || !poolExistsState || calculatedLpTokens <= 0}
            className="w-full dex-button dex-button-success py-3"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner"></div>
                <span>Adding Liquidity...</span>
              </div>
            ) : calculatedLpTokens <= 0 ? (
              'Calculating LP Tokens...'
            ) : (
              `Add Liquidity (${calculatedLpTokens.toFixed(6)} LP)`
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

      {/* Confirmation Modal */}
      {showConfirmModal && confirmData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-600 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Success State */}
            {confirmData.inputAmountA === -1 ? (
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-4">
                  {activeTab === 'add' ? 'Liquidity Added Successfully!' : 'Liquidity Removed Successfully!'}
                </h3>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
                  <p className="text-green-300 text-sm">
                    {activeTab === 'add'
                      ? 'Your liquidity has been successfully added to the pool. You now own LP tokens representing your share of the pool.'
                      : 'Your liquidity has been successfully removed from the pool. You have received your tokens back.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    setConfirmData(null)
                  }}
                  className="w-full dex-button dex-button-success py-3"
                >
                  Continue
                </button>
              </div>
            ) : confirmData.inputAmountA === -2 ? (
              /* Error State */
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-4">Transaction Failed</h3>
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
                  <p className="text-red-300 text-sm">
                    {activeTab === 'add'
                      ? 'The liquidity addition failed. Please check your balances and try again. Make sure you have enough tokens and the pool is properly initialized.'
                      : 'The liquidity removal failed. Please check your LP token balance and try again. Make sure you have enough LP tokens to remove.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowConfirmModal(false)
                    setConfirmData(null)
                  }}
                  className="w-full dex-button dex-button-secondary py-3"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Confirmation State */
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-4">Confirm Liquidity Addition</h3>

                {/* Amount Adjustment Warning */}
                {confirmData.actualAmountA !== confirmData.inputAmountA ||
                confirmData.actualAmountB !== confirmData.inputAmountB ? (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
                    <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Amounts Will Be Adjusted</h4>
                    <p className="text-yellow-300 text-sm mb-3">
                      Your amounts don't match the pool ratio. The backend will adjust them to maintain the correct
                      ratio:
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-yellow-300">You entered:</span>
                        <span className="text-white font-mono">
                          {confirmData.inputAmountA.toFixed(6)} {tokenA.symbol}, {confirmData.inputAmountB.toFixed(6)}{' '}
                          {tokenB.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-300">Will be used:</span>
                        <span className="text-white font-mono">
                          {confirmData.actualAmountA.toFixed(6)} {tokenA.symbol}, {confirmData.actualAmountB.toFixed(6)}{' '}
                          {tokenB.symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                    <h4 className="text-blue-400 font-semibold mb-2">✅ Amounts Match Pool Ratio</h4>
                    <p className="text-blue-300 text-sm">Your amounts match the current pool ratio perfectly.</p>
                  </div>
                )}

                {/* Transaction Summary */}
                <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                  <h4 className="text-white font-semibold mb-3">Transaction Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Token A ({tokenA.symbol}):</span>
                      <span className="text-white font-mono">{confirmData.actualAmountA.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Token B ({tokenB.symbol}):</span>
                      <span className="text-white font-mono">{confirmData.actualAmountB.toFixed(6)}</span>
                    </div>
                    <div className="border-t border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-green-400 font-semibold">LP Tokens to receive:</span>
                        <span className="text-green-300 font-mono font-bold">{confirmData.lpTokens.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowConfirmModal(false)
                      setConfirmData(null)
                    }}
                    className="flex-1 dex-button dex-button-secondary py-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeAddLiquidity}
                    disabled={isLoading}
                    className="flex-1 dex-button dex-button-success py-3"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="loading-spinner"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      'Confirm & Add Liquidity'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PoolManager
