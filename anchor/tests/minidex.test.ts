import {
  Blockhash,
  createSolanaClient,
  createTransaction,
  generateKeyPairSigner,
  Instruction,
  isSolanaError,
  KeyPairSigner,
  signTransactionMessageWithSigners,
} from 'gill'
import {
  fetchMinidex,
  getCloseInstruction,
  getDecrementInstruction,
  getIncrementInstruction,
  getInitializeInstruction,
  getSetInstruction,
} from '../src'
import { loadKeypairSignerFromFile } from 'gill/node'

const { rpc, sendAndConfirmTransaction } = createSolanaClient({ urlOrMoniker: process.env.ANCHOR_PROVIDER_URL! })

describe('minidex', () => {
  let payer: KeyPairSigner
  let minidex: KeyPairSigner

  beforeAll(async () => {
    minidex = await generateKeyPairSigner()
    payer = await loadKeypairSignerFromFile(process.env.ANCHOR_WALLET!)
  })

  it('Initialize Minidex', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getInitializeInstruction({ payer: payer, minidex: minidex })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSER
    const currentMinidex = await fetchMinidex(rpc, minidex.address)
    expect(currentMinidex.data.count).toEqual(0)
  })

  it('Increment Minidex', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getIncrementInstruction({
      minidex: minidex.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchMinidex(rpc, minidex.address)
    expect(currentCount.data.count).toEqual(1)
  })

  it('Increment Minidex Again', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getIncrementInstruction({ minidex: minidex.address })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchMinidex(rpc, minidex.address)
    expect(currentCount.data.count).toEqual(2)
  })

  it('Decrement Minidex', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getDecrementInstruction({
      minidex: minidex.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchMinidex(rpc, minidex.address)
    expect(currentCount.data.count).toEqual(1)
  })

  it('Set minidex value', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getSetInstruction({ minidex: minidex.address, value: 42 })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    const currentCount = await fetchMinidex(rpc, minidex.address)
    expect(currentCount.data.count).toEqual(42)
  })

  it('Set close the minidex account', async () => {
    // ARRANGE
    expect.assertions(1)
    const ix = getCloseInstruction({
      payer: payer,
      minidex: minidex.address,
    })

    // ACT
    await sendAndConfirm({ ix, payer })

    // ASSERT
    try {
      await fetchMinidex(rpc, minidex.address)
    } catch (e) {
      if (!isSolanaError(e)) {
        throw new Error(`Unexpected error: ${e}`)
      }
      expect(e.message).toEqual(`Account not found at address: ${minidex.address}`)
    }
  })
})

// Helper function to keep the tests DRY
let latestBlockhash: Awaited<ReturnType<typeof getLatestBlockhash>> | undefined
async function getLatestBlockhash(): Promise<Readonly<{ blockhash: Blockhash; lastValidBlockHeight: bigint }>> {
  if (latestBlockhash) {
    return latestBlockhash
  }
  return await rpc
    .getLatestBlockhash()
    .send()
    .then(({ value }) => value)
}
async function sendAndConfirm({ ix, payer }: { ix: Instruction; payer: KeyPairSigner }) {
  const tx = createTransaction({
    feePayer: payer,
    instructions: [ix],
    version: 'legacy',
    latestBlockhash: await getLatestBlockhash(),
  })
  const signedTransaction = await signTransactionMessageWithSigners(tx)
  return await sendAndConfirmTransaction(signedTransaction)
}
