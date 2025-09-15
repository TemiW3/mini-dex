import { MinidexAccount } from '@project/anchor'
import { Button } from '@/components/ui/button'

import { useMinidexCloseMutation } from '@/features/minidex/data-access/use-minidex-close-mutation'

export function MinidexUiButtonClose({ minidex }: { minidex: MinidexAccount }) {
  const closeMutation = useMinidexCloseMutation({ minidex })

  return (
    <Button
      variant="destructive"
      onClick={() => {
        if (!window.confirm('Are you sure you want to close this account?')) {
          return
        }
        return closeMutation.mutateAsync()
      }}
      disabled={closeMutation.isPending}
    >
      Close
    </Button>
  )
}
