import { AppExplorerLink } from '@/components/app-explorer-link'
import { ellipsify } from '@wallet-ui/react'

import { useMinidexProgramId } from '@/features/minidex/data-access/use-minidex-program-id'

export function MinidexUiProgramExplorerLink() {
  const programId = useMinidexProgramId()

  return <AppExplorerLink address={programId.toString()} label={ellipsify(programId.toString())} />
}
