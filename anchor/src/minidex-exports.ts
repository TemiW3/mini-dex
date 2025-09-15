// Here we export some useful types and functions for interacting with the Anchor program.
import { Account, address, getBase58Decoder, SolanaClient } from 'gill'
import { SolanaClusterId } from '@wallet-ui/react'
import { getProgramAccountsDecoded } from './helpers/get-program-accounts-decoded'
import { Minidex, MINIDEX_DISCRIMINATOR, MINIDEX_PROGRAM_ADDRESS, getMinidexDecoder } from './client/js'
import MinidexIDL from '../target/idl/minidex.json'

export type MinidexAccount = Account<Minidex, string>

// Re-export the generated IDL and type
export { MinidexIDL }

// This is a helper function to get the program ID for the Minidex program depending on the cluster.
export function getMinidexProgramId(cluster: SolanaClusterId) {
  switch (cluster) {
    case 'solana:devnet':
    case 'solana:testnet':
      // This is the program ID for the Minidex program on devnet and testnet.
      return address('6z68wfurCMYkZG51s1Et9BJEd9nJGUusjHXNt4dGbNNF')
    case 'solana:mainnet':
    default:
      return MINIDEX_PROGRAM_ADDRESS
  }
}

export * from './client/js'

export function getMinidexProgramAccounts(rpc: SolanaClient['rpc']) {
  return getProgramAccountsDecoded(rpc, {
    decoder: getMinidexDecoder(),
    filter: getBase58Decoder().decode(MINIDEX_DISCRIMINATOR),
    programAddress: MINIDEX_PROGRAM_ADDRESS,
  })
}
