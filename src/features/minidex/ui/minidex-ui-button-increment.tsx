import { MinidexAccount } from '@project/anchor'
import { Button } from '@/components/ui/button'
import { useMinidexIncrementMutation } from '../data-access/use-minidex-increment-mutation'

export function MinidexUiButtonIncrement({ minidex }: { minidex: MinidexAccount }) {
  const incrementMutation = useMinidexIncrementMutation({ minidex })

  return (
    <Button variant="outline" onClick={() => incrementMutation.mutateAsync()} disabled={incrementMutation.isPending}>
      Increment
    </Button>
  )
}
