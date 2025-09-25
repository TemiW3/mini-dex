import React from 'react'

interface LpTokenCalculatorProps {
  calculatedLpTokens: number
}

const LpTokenCalculator: React.FC<LpTokenCalculatorProps> = ({ calculatedLpTokens }) => {
  if (calculatedLpTokens <= 0) return null

  return (
    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
      <h4 className="text-green-400 font-semibold mb-2">LP Token Calculation</h4>
      <div className="space-y-2">
        <p className="text-sm text-green-300">
          You will receive: <span className="font-mono text-green-200">{calculatedLpTokens.toFixed(6)} LP tokens</span>
        </p>
      </div>
    </div>
  )
}

export default LpTokenCalculator
