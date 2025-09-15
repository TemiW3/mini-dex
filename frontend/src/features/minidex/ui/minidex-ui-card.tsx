import { MinidexAccount } from '@project/anchor'
import { ellipsify } from '@wallet-ui/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { MinidexUiButtonClose } from './minidex-ui-button-close'
import { MinidexUiButtonDecrement } from './minidex-ui-button-decrement'
import { MinidexUiButtonIncrement } from './minidex-ui-button-increment'
import { MinidexUiButtonSet } from './minidex-ui-button-set'

export function MinidexUiCard({ minidex }: { minidex: MinidexAccount }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Minidex: {minidex.data.count}</CardTitle>
        <CardDescription>
          Account: <AppExplorerLink address={minidex.address} label={ellipsify(minidex.address)} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 justify-evenly">
          <MinidexUiButtonIncrement minidex={minidex} />
          <MinidexUiButtonSet minidex={minidex} />
          <MinidexUiButtonDecrement minidex={minidex} />
          <MinidexUiButtonClose minidex={minidex} />
        </div>
      </CardContent>
    </Card>
  )
}
