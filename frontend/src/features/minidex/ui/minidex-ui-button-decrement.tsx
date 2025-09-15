import { MinidexAccount } from '@project/anchor'
import { Button } from '@/components/ui/button'

import { useMinidexDecrementMutation } from '../data-access/use-minidex-decrement-mutation'

export function MinidexUiButtonDecrement({ minidex }: { minidex: MinidexAccount }) {
  const decrementMutation = useMinidexDecrementMutation({ minidex })

  return (
    <Button variant="outline" onClick={() => decrementMutation.mutateAsync()} disabled={decrementMutation.isPending}>
      Decrement
    </Button>
  )
}
