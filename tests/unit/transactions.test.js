import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import { Transactions } from '../../src/modules/Transactions.js'
import {
  parseReplaysList,
  parseTransactionsList,
  Replay,
} from '../../src/models/Transaction.js'

describe('parseTransactionsList', () => {
  it('parses camelCase success payload', () => {
    const list = parseTransactionsList(
      JSON.stringify({
        transactions: [
          {
            replayId: 'abc',
            start: '2024-01-02T03:04:05Z',
            end: '2024-01-02T03:05:00Z',
            currency: 'USD',
            bet: 100,
            win: 250,
            jackpot: 0,
            pending: false,
            gameStates: [
              {
                id: 'gs1',
                gameState: '{"WalletPhase":"Settled"}',
                timestamp: '2024-01-02T03:05:00Z',
              },
            ],
          },
        ],
      }),
    )
    assert.equal(list.Transactions.length, 1)
    const tx = list.Transactions[0]
    assert.equal(tx.ReplayId, 'abc')
    assert.equal(tx.Currency, 'USD')
    assert.equal(tx.Bet, 100)
    assert.equal(tx.Win, 250)
    assert.equal(tx.GameStates.length, 1)
    assert.equal(tx.GameStates[0].Id, 'gs1')
    assert.deepEqual(tx.GameStates[0].parseGameState(), {
      WalletPhase: 'Settled',
    })
  })

  it('parses PascalCase payload', () => {
    const list = parseTransactionsList({
      Transactions: [{ ReplayId: 'x', Bet: 1, Win: 0, Currency: 'COINS' }],
    })
    assert.equal(list.Transactions[0].ReplayId, 'x')
    assert.equal(list.Transactions[0].Currency, 'COINS')
  })

  it('throws on invalid json', () => {
    assert.throws(() => parseTransactionsList('{not-json'), /parse error/)
  })
})

describe('parseReplaysList', () => {
  it('returns Transaction[] from ReplayList shape', () => {
    const replays = parseReplaysList(
      JSON.stringify({
        replays: [
          {
            replayId: 'r1',
            bet: 50,
            win: 0,
            gameStates: [{ id: '1', gameState: '{}' }],
          },
        ],
      }),
    )
    assert.equal(replays.length, 1)
    assert.equal(replays[0].ReplayId, 'r1')
    assert.equal(replays[0].Bet, 50)
  })
})

describe('Replay.parseGameState', () => {
  it('returns null for empty / invalid', () => {
    assert.equal(new Replay().parseGameState(), null)
    assert.equal(new Replay({ GameState: 'nope' }).parseGameState(), null)
  })
})

describe('Transactions module', () => {
  it('getTransactionsList builds Unity URL shape', async () => {
    const sendGET = mock.fn(async () =>
      JSON.stringify({
        transactions: [{ replayId: 't1', bet: 10, win: 0 }],
      }),
    )
    const module = new Transactions(
      { sendGET },
      () => ({ connectionId: 'conn-123' }),
      () => true,
    )
    const result = await module.getTransactionsList({
      startIndex: 5,
      includeGameStates: true,
    })

    assert.equal(sendGET.mock.callCount(), 1)
    const [url] = sendGET.mock.calls[0].arguments
    assert.match(
      String(url),
      /sessions\/replay\/transactions\/conn-123\/true\/5$/,
    )
    assert.equal(result.Transactions[0].ReplayId, 't1')
  })

  it('getReplaysList builds replay URL', async () => {
    const sendGET = mock.fn(async () =>
      JSON.stringify({ replays: [{ replayId: 'short-1', bet: 1, win: 2 }] }),
    )
    const module = new Transactions(
      { sendGET },
      () => ({ connectionId: 'c' }),
      () => true,
    )
    const replays = await module.getReplaysList('short-1')
    const [url] = sendGET.mock.calls[0].arguments
    assert.match(String(url), /sessions\/replay\/short-1$/)
    assert.equal(replays[0].ReplayId, 'short-1')
  })

  it('rejects when not authorized', async () => {
    const module = new Transactions(
      { sendGET: async () => '{}' },
      () => ({ connectionId: 'c' }),
      () => false,
    )
    await assert.rejects(
      () => module.getTransactionsList(),
      /not authorized/,
    )
  })

  it('rejects empty shortReplayId', async () => {
    const module = new Transactions(
      { sendGET: async () => '{}' },
      () => ({ connectionId: 'c' }),
      () => true,
    )
    await assert.rejects(() => module.getReplaysList(''), /shortReplayId/)
  })
})
