import { useSolana } from '@/components/solana/use-solana'
import { useQuery } from '@tanstack/react-query'
import { getMinidexProgramAccounts } from '@project/anchor'
import { useMinidexAccountsQueryKey } from './use-minidex-accounts-query-key'

export function useMinidexAccountsQuery() {
  const { client } = useSolana()

  return useQuery({
    queryKey: useMinidexAccountsQueryKey(),
    queryFn: async () => await getMinidexProgramAccounts(client.rpc),
  })
}
