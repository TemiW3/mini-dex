import { useMemo } from 'react'
import { getMinidexProgramId } from '@project/anchor'
import { useSolana } from '@/components/solana/use-solana'

export function useMinidexProgramId() {
  const { cluster } = useSolana()
  return useMemo(() => getMinidexProgramId(cluster.id), [cluster])
}
