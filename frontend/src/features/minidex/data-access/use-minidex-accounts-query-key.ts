import { useSolana } from '@/components/solana/use-solana'

export function useMinidexAccountsQueryKey() {
  const { cluster } = useSolana()

  return ['minidex', 'accounts', { cluster }]
}
