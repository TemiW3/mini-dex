import { MinidexUiCard } from './minidex-ui-card'
import { useMinidexAccountsQuery } from '@/features/minidex/data-access/use-minidex-accounts-query'

export function MinidexUiList() {
  const minidexAccountsQuery = useMinidexAccountsQuery()

  if (minidexAccountsQuery.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  if (!minidexAccountsQuery.data?.length) {
    return (
      <div className="text-center">
        <h2 className={'text-2xl'}>No accounts</h2>
        No accounts found. Initialize one to get started.
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {minidexAccountsQuery.data?.map((minidex) => (
        <MinidexUiCard key={minidex.address} minidex={minidex} />
      ))}
    </div>
  )
}
