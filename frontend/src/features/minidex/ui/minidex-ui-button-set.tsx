import { MinidexAccount } from '@project/anchor'
import { Button } from '@/components/ui/button'

import { useMinidexSetMutation } from '@/features/minidex/data-access/use-minidex-set-mutation'

export function MinidexUiButtonSet({ minidex }: { minidex: MinidexAccount }) {
  const setMutation = useMinidexSetMutation({ minidex })

  return (
    <Button
      variant="outline"
      onClick={() => {
        const value = window.prompt('Set value to:', minidex.data.count.toString() ?? '0')
        if (!value || parseInt(value) === minidex.data.count || isNaN(parseInt(value))) {
          return
        }
        return setMutation.mutateAsync(parseInt(value))
      }}
      disabled={setMutation.isPending}
    >
      Set
    </Button>
  )
}
