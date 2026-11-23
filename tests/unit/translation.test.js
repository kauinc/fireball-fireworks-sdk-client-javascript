import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import { Translation } from '../../src/modules/Translation.js'
import {
  flattenTranslation,
  parseTranslationResponse,
} from '../../src/modules/TranslationData.js'

describe('flattenTranslation', () => {
  it('keeps flat keys', () => {
    assert.deepEqual(flattenTranslation({ label_balance: 'BALANCE' }), {
      label_balance: 'BALANCE',
    })
  })

  it('flattens nested objects with dot keys', () => {
    assert.deepEqual(
      flattenTranslation({ label: { balance: 'BALANCE', total: 'TOTAL' } }),
      { 'label.balance': 'BALANCE', 'label.total': 'TOTAL' },
    )
  })
})

describe('parseTranslationResponse', () => {
  it('parses camelCase success payload', () => {
    const data = parseTranslationResponse(
      JSON.stringify({
        statusCode: 200,
        data: {
          id: 'pack-1',
          appName: 'DoofTroop',
          translation: { label_balance: 'BALANCE:' },
        },
      }),
    )
    assert.equal(data.id, 'pack-1')
    assert.equal(data.appName, 'DoofTroop')
    assert.equal(data.translation.label_balance, 'BALANCE:')
  })

  it('throws on invalid json', () => {
    assert.throws(() => parseTranslationResponse('{not-json'), /parse error/)
  })

  it('throws when data is missing', () => {
    assert.throws(
      () => parseTranslationResponse(JSON.stringify({ statusCode: 200 })),
      /missing data/,
    )
  })
})

describe('Translation.getTranslation', () => {
  it('calls sendGET with appId and languageIsoCode', async () => {
    const sendGET = mock.fn(async () =>
      JSON.stringify({
        statusCode: 200,
        data: {
          id: '1',
          appName: 'Doof',
          translation: { label_home: 'Home' },
        },
      }),
    )
    const module = new Translation({ sendGET })
    const result = await module.getTranslation('game-uuid', 'uk')

    assert.equal(sendGET.mock.callCount(), 1)
    const [url, query] = sendGET.mock.calls[0].arguments
    assert.match(String(url), /translations\/v1\/translate/)
    assert.deepEqual(query, { appId: 'game-uuid', languageIsoCode: 'uk' })
    assert.equal(result.translation.label_home, 'Home')
  })

  it('propagates HTTP failures', async () => {
    const module = new Translation({
      sendGET: async () => {
        throw new Error('GET failed (500)')
      },
    })
    await assert.rejects(
      () => module.getTranslation('game-uuid', 'en'),
      /GET failed/,
    )
  })

  it('rejects empty gameId', async () => {
    const module = new Translation({ sendGET: async () => '{}' })
    await assert.rejects(() => module.getTranslation('', 'en'), /gameId/)
  })
})
