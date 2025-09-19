import { useQueryClient } from '@tanstack/react-query'
import { useMinidexAccountsQueryKey } from './use-minidex-accounts-query-key'

export function useMinidexAccountsInvalidate() {
  const queryClient = useQueryClient()
  const queryKey = useMinidexAccountsQueryKey()

  return () => queryClient.invalidateQueries({ queryKey })
}
