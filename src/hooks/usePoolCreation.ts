import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

export interface InitStep {
  name: string
  completed: boolean
  tx: string | null
}

export const usePoolCreation = () => {
  const { publicKey } = useWallet()
  const [deployerAddress, setDeployerAddress] = useState<string | null>(null)
  const [isCheckingDeployer, setIsCheckingDeployer] = useState(false)
  const [initStep, setInitStep] = useState(0)
  const [initSteps, setInitSteps] = useState<InitStep[]>([
    { name: 'Create Pool', completed: false, tx: null },
    { name: 'Initialize Vault A', completed: false, tx: null },
    { name: 'Initialize Vault B', completed: false, tx: null },
    { name: 'Initialize LP Mint', completed: false, tx: null },
  ])

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

  // Check pool creation permission when component mounts
  useEffect(() => {
    checkPoolCreationPermission()
  }, [])

  const resetInitSteps = () => {
    setInitSteps([
      { name: 'Create Pool', completed: false, tx: null },
      { name: 'Initialize Vault A', completed: false, tx: null },
      { name: 'Initialize Vault B', completed: false, tx: null },
      { name: 'Initialize LP Mint', completed: false, tx: null },
    ])
  }

  const updateInitStep = (stepIndex: number, completed: boolean, tx: string | null = null) => {
    setInitSteps((prev) => prev.map((step, i) => (i === stepIndex ? { ...step, completed, tx } : step)))
  }

  return {
    deployerAddress,
    isCheckingDeployer,
    canCreatePools,
    initStep,
    initSteps,
    setInitStep,
    resetInitSteps,
    updateInitStep,
    checkPoolCreationPermission,
  }
}
