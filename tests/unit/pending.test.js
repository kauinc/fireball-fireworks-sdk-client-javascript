import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FireballClient } from '../../src/core/FireballClient.js'

describe('pending ActionId matching', () => {
  it('matches exact and substring ActionIds like Unity', () => {
    const client = new FireballClient()
    client._addPendingResponse('abc-def', { Name: 'session' })
    assert.equal(client._isPendingResponse('abc-def'), true)
    assert.equal(client._isPendingResponse('abc'), true)
    assert.equal(client._getPendingResponse('def')?.Name, 'session')
    assert.equal(client._isPendingResponse('zzz'), false)
  })
})
