import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { MinidexUiButtonInitialize } from './ui/minidex-ui-button-initialize'
import { MinidexUiList } from './ui/minidex-ui-list'
import { MinidexUiProgramExplorerLink } from './ui/minidex-ui-program-explorer-link'
import { MinidexUiProgramGuard } from './ui/minidex-ui-program-guard'

export default function MinidexFeature() {
  const { account } = useSolana()

  return (
    <MinidexUiProgramGuard>
      <AppHero
        title="Minidex"
        subtitle={
          account
            ? "Initialize a new minidex onchain by clicking the button. Use the program's methods (increment, decrement, set, and close) to change the state of the account."
            : 'Select a wallet to run the program.'
        }
      >
        <p className="mb-6">
          <MinidexUiProgramExplorerLink />
        </p>
        {account ? (
          <MinidexUiButtonInitialize />
        ) : (
          <div style={{ display: 'inline-block' }}>
            <WalletDropdown />
          </div>
        )}
      </AppHero>
      {account ? <MinidexUiList /> : null}
    </MinidexUiProgramGuard>
  )
}
