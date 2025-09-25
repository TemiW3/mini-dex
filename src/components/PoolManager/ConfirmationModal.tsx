import React from 'react'

export interface ConfirmData {
  inputAmountA: number
  inputAmountB: number
  actualAmountA: number
  actualAmountB: number
  lpTokens: number
}

interface ConfirmationModalProps {
  showConfirmModal: boolean
  confirmData: ConfirmData | null
  activeTab: 'create' | 'add' | 'remove'
  tokenA: { symbol: string }
  tokenB: { symbol: string }
  isLoading: boolean
  onClose: () => void
  onConfirm: () => void
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  showConfirmModal,
  confirmData,
  activeTab,
  tokenA,
  tokenB,
  isLoading,
  onClose,
  onConfirm,
}) => {
  if (!showConfirmModal || !confirmData) return null

  return (
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
            <button onClick={onClose} className="w-full dex-button dex-button-success py-3">
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
            <button onClick={onClose} className="w-full dex-button dex-button-secondary py-3">
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

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
              <h4 className="text-blue-400 font-semibold mb-2">✅ Pool Ratio Maintained</h4>
              <p className="text-blue-300 text-sm">Your amounts maintain the correct pool ratio automatically.</p>
            </div>

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
              <button onClick={onClose} className="flex-1 dex-button dex-button-secondary py-3">
                Cancel
              </button>
              <button onClick={onConfirm} disabled={isLoading} className="flex-1 dex-button dex-button-success py-3">
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
  )
}

export default ConfirmationModal
