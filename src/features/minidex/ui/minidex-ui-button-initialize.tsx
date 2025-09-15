import { Button } from '@/components/ui/button'

import { useMinidexInitializeMutation } from '@/features/minidex/data-access/use-minidex-initialize-mutation'

export function MinidexUiButtonInitialize() {
  const mutationInitialize = useMinidexInitializeMutation()

  return (
    <Button onClick={() => mutationInitialize.mutateAsync()} disabled={mutationInitialize.isPending}>
      Initialize Minidex {mutationInitialize.isPending && '...'}
    </Button>
  )
}
