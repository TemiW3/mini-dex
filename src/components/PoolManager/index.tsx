import React, { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Plus, Minus } from 'lucide-react'
import { TOKENS } from '../../constants/tokens'
import { useMiniDex } from '../../hooks/useMiniDex'
import { useTokenBalances } from '../../hooks/useTokenBalances'
import { usePoolData } from '../../hooks/usePoolData'
import { useLpCalculations } from '../../hooks/useLpCalculations'
import { usePoolCreation } from '../../hooks/usePoolCreation'
import CreatePoolTab from './CreatePoolTab'
import AddLiquidityTab from './AddLiquidityTab'
import RemoveLiquidityTab from './RemoveLiquidityTab'
import ConfirmationModal, { ConfirmData } from './ConfirmationModal'

const PoolManager: React.FC = () => {
  const { publicKey } = useWallet()
  const {
    initializePool,
    initializeVaultA,
    initializeVaultB,
    initializeLpMint,
    addLiquidity,
    removeLiquidity,
    poolExists,
    getPoolInfo,
    listExistingPools,
  } = useMiniDex()

  const [activeTab, setActiveTab] = useState<'create' | 'add' | 'remove'>('add')
  const [tokenA, setTokenA] = useState(TOKENS[0])
  const [tokenB, setTokenB] = useState(TOKENS[1])
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [lpTokens, setLpTokens] = useState('')
  const [feeRate, setFeeRate] = useState('30') // 0.3% default
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null)

  // Existing on-chain pool pairs for Add Liquidity pair selector
  const [existingPairs, setExistingPairs] = useState<
    Array<{ tokenA: (typeof TOKENS)[number]; tokenB: (typeof TOKENS)[number] }>
  >([])
  const [loadingPairs, setLoadingPairs] = useState<boolean>(false)

  // Custom hooks
  const poolData = usePoolData(tokenA, tokenB, poolExists, getPoolInfo)
  const tokenBalances = useTokenBalances(tokenA, tokenB, poolData.poolExistsState, getPoolInfo)
  const lpCalculations = useLpCalculations(amountA, amountB, tokenA, tokenB, poolData.poolRatio, getPoolInfo)
  const poolCreation = usePoolCreation()

  // Load existing pool pairs from chain for Add tab pair dropdown
  useEffect(() => {
    const loadPairs = async () => {
      setLoadingPairs(true)
      try {
        const pools = await listExistingPools()
        const pairs: Array<{ tokenA: (typeof TOKENS)[number]; tokenB: (typeof TOKENS)[number] }> = []

        for (const pool of pools) {
          const poolInfo = pool.account
          const tokenAMint = poolInfo.tokenAMint.toString()
          const tokenBMint = poolInfo.tokenBMint.toString()

          const tokenA = TOKENS.find((t) => t.mint === tokenAMint)
          const tokenB = TOKENS.find((t) => t.mint === tokenBMint)

          if (tokenA && tokenB) {
            pairs.push({ tokenA, tokenB })
          }
        }

        setExistingPairs(pairs)

        // If current selection isn't in pairs, and pairs exist, default to first
        // Only auto-select pairs for Add and Remove tabs, not Create tab
        if (pairs.length > 0 && (activeTab === 'add' || activeTab === 'remove')) {
          const match = pairs.find((p) => p.tokenA.mint === tokenA.mint && p.tokenB.mint === tokenB.mint)
          if (!match) {
            setTokenA(pairs[0].tokenA)
            setTokenB(pairs[0].tokenB)
            setAmountA('')
            setAmountB('')
            setLpTokens('')
          }
        }
      } catch (error) {
        console.error('Error loading existing pairs:', error)
        setExistingPairs([])
      } finally {
        setLoadingPairs(false)
      }
    }
    loadPairs()
  }, [listExistingPools, tokenA.mint, tokenB.mint, activeTab])

  // Reset token selection when switching to Create tab to allow free selection
  useEffect(() => {
    if (activeTab === 'create') {
      // Reset to default tokens for Create tab
      setTokenA(TOKENS[0])
      setTokenB(TOKENS[1])
      setAmountA('')
      setAmountB('')
      setLpTokens('')
    }
  }, [activeTab])

  const handleCreatePool = async () => {
    if (!publicKey) {
      alert('Please connect your wallet')
      return
    }

    if (!poolCreation.canCreatePools) {
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
    poolCreation.setInitStep(0)
    poolCreation.resetInitSteps()

    try {
      // Step 1: Create Pool
      poolCreation.setInitStep(1)
      const poolTx = await initializePool(tokenA.mint, tokenB.mint, fee)
      if (!poolTx) throw new Error('Failed to create pool')
      poolCreation.updateInitStep(0, true, poolTx)

      // Step 2: Initialize Vault A
      poolCreation.setInitStep(2)
      const vaultATx = await initializeVaultA(tokenA.mint, tokenB.mint)
      if (!vaultATx) throw new Error('Failed to initialize vault A')
      poolCreation.updateInitStep(1, true, vaultATx)

      // Step 3: Initialize Vault B
      poolCreation.setInitStep(3)
      const vaultBTx = await initializeVaultB(tokenA.mint, tokenB.mint)
      if (!vaultBTx) throw new Error('Failed to initialize vault B')
      poolCreation.updateInitStep(2, true, vaultBTx)

      // Step 4: Initialize LP Mint
      poolCreation.setInitStep(4)
      const lpMintTx = await initializeLpMint(tokenA.mint, tokenB.mint)
      if (!lpMintTx) throw new Error('Failed to initialize LP mint')
      poolCreation.updateInitStep(3, true, lpMintTx)

      alert(`Pool created successfully! All transactions completed.`)
      poolCreation.setInitStep(0)
    } catch (error) {
      console.error('Pool creation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Pool creation failed at step ${poolCreation.initStep}: ${errorMessage}`)
      poolCreation.setInitStep(0)
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

    // Get the LP tokens that will be received
    const { lpTokens } = await lpCalculations.calculateLpTokens(inputAmountA, inputAmountB)

    if (lpTokens <= 0) {
      alert('Calculated LP tokens is 0 or negative. Please check your amounts.')
      return
    }

    // Show confirmation modal
    setConfirmData({
      inputAmountA,
      inputAmountB,
      actualAmountA: inputAmountA,
      actualAmountB: inputAmountB,
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
        confirmData.inputAmountA,
        confirmData.inputAmountB,
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
        await tokenBalances.fetchTokenBalances()
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
        await tokenBalances.fetchTokenBalances()
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

  const handlePairSelect = (newTokenA: (typeof TOKENS)[number], newTokenB: (typeof TOKENS)[number]) => {
    setTokenA(newTokenA)
    setTokenB(newTokenB)
    setAmountA('')
    setAmountB('')
    setLpTokens('')
  }

  const handleRefresh = async () => {
    // Refresh both balances and pairs
    await tokenBalances.fetchTokenBalances()

    setLoadingPairs(true)
    try {
      const pools = await listExistingPools()
      const pairs: Array<{ tokenA: (typeof TOKENS)[number]; tokenB: (typeof TOKENS)[number] }> = []

      for (const pool of pools) {
        const poolInfo = pool.account
        const tokenAMint = poolInfo.tokenAMint.toString()
        const tokenBMint = poolInfo.tokenBMint.toString()

        const tokenA = TOKENS.find((t) => t.mint === tokenAMint)
        const tokenB = TOKENS.find((t) => t.mint === tokenBMint)

        if (tokenA && tokenB) {
          pairs.push({ tokenA, tokenB })
        }
      }

      setExistingPairs(pairs)
    } catch (error) {
      console.error('Error loading existing pairs:', error)
      setExistingPairs([])
    } finally {
      setLoadingPairs(false)
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
    const isDisabled = isCreateTab && !poolCreation.canCreatePools

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
        {isCreateTab && poolCreation.isCheckingDeployer && <span className="text-xs">⏳</span>}
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
        <CreatePoolTab
          tokenA={tokenA}
          tokenB={tokenB}
          feeRate={feeRate}
          isLoading={isLoading}
          initStep={poolCreation.initStep}
          initSteps={poolCreation.initSteps}
          canCreatePools={poolCreation.canCreatePools || false}
          deployerAddress={poolCreation.deployerAddress}
          isCheckingDeployer={poolCreation.isCheckingDeployer}
          onTokenAChange={setTokenA}
          onTokenBChange={setTokenB}
          onFeeRateChange={setFeeRate}
          onCreatePool={handleCreatePool}
        />
      )}

      {/* Add Liquidity Tab */}
      {activeTab === 'add' && (
        <AddLiquidityTab
          tokenA={tokenA}
          tokenB={tokenB}
          amountA={amountA}
          amountB={amountB}
          tokenABalance={tokenBalances.tokenABalance}
          tokenBBalance={tokenBalances.tokenBBalance}
          lpTokenBalance={tokenBalances.lpTokenBalance}
          lpTokenSymbol={tokenBalances.lpTokenSymbol}
          poolHasLiquidity={poolData.poolHasLiquidity}
          poolRatio={poolData.poolRatio}
          ratioError={lpCalculations.ratioError}
          calculatedLpTokens={lpCalculations.calculatedLpTokens}
          existingPairs={existingPairs}
          loadingPairs={loadingPairs}
          isLoading={isLoading}
          onAmountAChange={setAmountA}
          onAmountBChange={setAmountB}
          onPairSelect={handlePairSelect}
          onRefresh={handleRefresh}
          onAddLiquidity={handleAddLiquidity}
          calculateTokenBAmount={lpCalculations.calculateTokenBAmount}
        />
      )}

      {/* Remove Liquidity Tab */}
      {activeTab === 'remove' && (
        <RemoveLiquidityTab
          tokenA={tokenA}
          tokenB={tokenB}
          lpTokens={lpTokens}
          tokenABalance={tokenBalances.tokenABalance}
          tokenBBalance={tokenBalances.tokenBBalance}
          lpTokenBalance={tokenBalances.lpTokenBalance}
          lpTokenSymbol={tokenBalances.lpTokenSymbol}
          existingPairs={existingPairs}
          loadingPairs={loadingPairs}
          isLoading={isLoading}
          onLpTokensChange={setLpTokens}
          onPairSelect={handlePairSelect}
          onRefresh={handleRefresh}
          onRemoveLiquidity={handleRemoveLiquidity}
        />
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
      <ConfirmationModal
        showConfirmModal={showConfirmModal}
        confirmData={confirmData}
        activeTab={activeTab}
        tokenA={tokenA}
        tokenB={tokenB}
        isLoading={isLoading}
        onClose={() => {
          setShowConfirmModal(false)
          setConfirmData(null)
        }}
        onConfirm={executeAddLiquidity}
      />
    </div>
  )
}

export default PoolManager
