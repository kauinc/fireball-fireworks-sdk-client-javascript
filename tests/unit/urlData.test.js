import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseSessionFromUrl, parseUrlParams } from '../../src/tools/urlData.js'
import { FireballConfig } from '../../src/core/FireballConfig.js'

describe('parseUrlParams', () => {
  it('parses query string from absolute URL', () => {
    const params = parseUrlParams(
      'https://cdn.example/game/?operatorId=op1&gameId=g1&token=abc&mode=money',
    )
    assert.equal(params.operatorId, 'op1')
    assert.equal(params.gameId, 'g1')
    assert.equal(params.token, 'abc')
    assert.equal(params.mode, 'money')
  })
})

describe('parseSessionFromUrl', () => {
  it('maps known params into session and extras', () => {
    const session = parseSessionFromUrl(
      'https://x/?operatorId=op&gameId=doof&token=t1&environment=staging&currency=EUR&language=uk&home=https%3A%2F%2Fcasino.example%2F&foo=bar',
    )
    assert.equal(session.operatorId, 'op')
    assert.equal(session.gameId, 'doof')
    assert.equal(session.token, 't1')
    assert.equal(session.environment, 'staging')
    assert.equal(session.currency, 'EUR')
    assert.equal(session.language, 'uk')
    assert.equal(session.homeUrl, 'https://casino.example/')
    assert.equal(session.extra.foo, 'bar')
    assert.equal(session.extra.currency, 'EUR')
    assert.equal(session.router, FireballConfig.URL_ROUTER_DEFAULT)
  })

  it('defaults invalid mode/environment', () => {
    const session = parseSessionFromUrl(
      'https://x/?operatorId=op&gameId=g&token=t&mode=nope&environment=xyz',
    )
    assert.equal(session.gameMode, FireballConfig.DEFAULT_GAME_MODE)
    assert.equal(session.environment, FireballConfig.DEFAULT_ENVIRONMENT)
  })
})
