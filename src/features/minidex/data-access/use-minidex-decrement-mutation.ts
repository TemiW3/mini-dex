import { MinidexAccount, getDecrementInstruction } from '@project/anchor'
import { useMutation } from '@tanstack/react-query'
import { useWalletUiSigner } from '@/components/solana/use-wallet-ui-signer'
import { useWalletTransactionSignAndSend } from '@/components/solana/use-wallet-transaction-sign-and-send'
import { toastTx } from '@/components/toast-tx'
import { useMinidexAccountsInvalidate } from './use-minidex-accounts-invalidate'

export function useMinidexDecrementMutation({ minidex }: { minidex: MinidexAccount }) {
  const invalidateAccounts = useMinidexAccountsInvalidate()
  const signer = useWalletUiSigner()
  const signAndSend = useWalletTransactionSignAndSend()

  return useMutation({
    mutationFn: async () => await signAndSend(getDecrementInstruction({ minidex: minidex.address }), signer),
    onSuccess: async (tx) => {
      toastTx(tx)
      await invalidateAccounts()
    },
  })
}
