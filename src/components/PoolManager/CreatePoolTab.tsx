import React from 'react'
import { CheckCircle } from 'lucide-react'
import TokenSelector from '../TokenSelector'
import { TOKENS } from '../../constants/tokens'
import { InitStep } from '../../hooks/usePoolCreation'

interface CreatePoolTabProps {
  tokenA: (typeof TOKENS)[number]
  tokenB: (typeof TOKENS)[number]
  feeRate: string
  isLoading: boolean
  initStep: number
  initSteps: InitStep[]
  canCreatePools: boolean
  deployerAddress: string | null
  isCheckingDeployer: boolean
  onTokenAChange: (token: (typeof TOKENS)[number]) => void
  onTokenBChange: (token: (typeof TOKENS)[number]) => void
  onFeeRateChange: (feeRate: string) => void
  onCreatePool: () => void
}

const CreatePoolTab: React.FC<CreatePoolTabProps> = ({
  tokenA,
  tokenB,
  feeRate,
  isLoading,
  initStep,
  initSteps,
  canCreatePools,
  deployerAddress,
  onTokenAChange,
  onTokenBChange,
  onFeeRateChange,
  onCreatePool,
}) => {
  return (
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
          <TokenSelector selectedToken={tokenA} onTokenSelect={onTokenAChange} excludeToken={tokenB} />
        </div>
        <div>
          <label className="text-gray-300 text-sm font-medium mb-2 block">Token B</label>
          <TokenSelector selectedToken={tokenB} onTokenSelect={onTokenBChange} excludeToken={tokenA} />
        </div>
      </div>

      <div className={!canCreatePools ? 'opacity-50 pointer-events-none' : ''}>
        <label className="text-gray-300 text-sm font-medium mb-2 block">Fee Rate (basis points)</label>
        <input
          type="number"
          value={feeRate}
          onChange={(e) => onFeeRateChange(e.target.value)}
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
                {step.completed ? <CheckCircle size={16} /> : <span className="text-xs font-bold">{index + 1}</span>}
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
        onClick={onCreatePool}
        disabled={!canCreatePools || isLoading}
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
  )
}

export default CreatePoolTab
