import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FireballSession } from '../../src/core/FireballSession.js'
import { AuthRequest } from '../../src/models/AuthRequest.js'
import { createRequest } from '../../src/models/BaseRequest.js'
import {
  ErrorResponse,
  isErrorPayload,
} from '../../src/models/ErrorResponse.js'
import { settingsToSession } from '../../src/core/FireballSettings.js'

describe('createRequest / AuthRequest', () => {
  it('copies session fields into request', () => {
    const session = new FireballSession({
      operatorId: 'op',
      gameId: 'g',
      token: 'tok',
      connectionId: 'cid',
      environment: 'development',
      currency: 'USD',
      extra: { a: '1' },
    })
    const req = new AuthRequest(session)
    assert.equal(req.Name, 'authenticate')
    assert.equal(req.OperatorId, 'op')
    assert.equal(req.GameId, 'g')
    assert.equal(req.Token, 'tok')
    assert.equal(req.ConnectionId, 'cid')
    assert.ok(req.ActionId)
    assert.ok(req.MessageId)

    const json = JSON.parse(req.toJson())
    assert.equal(json.Token, 'tok')
    assert.equal(json.Name, 'authenticate')
  })

  it('includes custom game fields in JSON', () => {
    const session = settingsToSession({
      operatorId: 'op',
      gameId: 'doof',
      token: 't',
    })
    const req = createRequest('place-chip', session, null, {
      RoundId: 'r1',
      ChipValue: 2,
    })
    const json = JSON.parse(req.toJson())
    assert.equal(json.Name, 'place-chip')
    assert.equal(json.RoundId, 'r1')
    assert.equal(json.ChipValue, 2)
    assert.equal(json.OperatorId, 'op')
  })
})

describe('ErrorResponse', () => {
  it('builds custom and timeout errors', () => {
    const custom = ErrorResponse.customError('a1', 'boom', 7)
    assert.equal(custom.Name, 'error')
    assert.equal(custom.Reason, 'boom')
    assert.equal(custom.Code, 7)
    assert.equal(custom.isCustomError, true)

    const timeout = ErrorResponse.timeoutResponse('a2', 30)
    assert.equal(timeout.Name, 'timeout')
    assert.match(timeout.Reason, /30/)
    assert.equal(timeout.isTimeout, true)
  })

  it('detects error payloads', () => {
    assert.equal(isErrorPayload({ Reason: 'x' }), true)
    assert.equal(isErrorPayload({ Name: 'session' }), false)
  })
})
