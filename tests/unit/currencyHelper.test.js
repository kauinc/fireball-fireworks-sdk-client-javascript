import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  CurrencyHelper,
  formatMoney,
  isCoinCurrency,
  setSession,
} from '../../src/tools/CurrencyHelper.js'
import { FireballSession } from '../../src/core/FireballSession.js'
import { GameMode } from '../../src/core/FireballConfig.js'

describe('CurrencyHelper', () => {
  beforeEach(() => {
    setSession(null)
  })

  it('formats coins as integers', () => {
    setSession(
      new FireballSession({
        gameMode: GameMode.coins,
        currency: 'COINS',
        country: 'US',
        language: 'uk',
      }),
    )
    assert.equal(formatMoney(1234), '1,234')
    assert.equal(isCoinCurrency('COINS'), true)
  })

  it('formats USD from currency culture (ignores UI language)', () => {
    setSession(
      new FireballSession({
        gameMode: GameMode.money,
        currency: 'USD',
        country: 'US',
        language: 'uk',
        multiplier: 100,
      }),
    )
    assert.equal(formatMoney(500000), '$5,000.00')
  })

  it('formats EUR with currency-derived culture', () => {
    setSession(
      new FireballSession({
        gameMode: GameMode.money,
        currency: 'EUR',
        country: 'DE',
        language: 'uk',
        multiplier: 100,
      }),
    )
    const text = formatMoney(500000)
    assert.match(text, /€/)
    assert.match(text, /5[. ]?000,00|5\.000,00/)
  })

  it('formats UAH via Intl narrowSymbol (no symbol hardcode)', () => {
    setSession(
      new FireballSession({
        gameMode: GameMode.fun,
        currency: 'UAH',
        country: 'US',
        language: 'uk',
        multiplier: 100,
      }),
    )
    const text = formatMoney(500000)
    // CLDR narrow for UAH is ₴ — same source .NET CurrencySymbol uses.
    assert.match(text, /₴/)
    assert.doesNotMatch(text, /грн/i)
  })

  it('exports CurrencyHelper facade', () => {
    assert.equal(typeof CurrencyHelper.formatMoney, 'function')
    assert.equal(typeof CurrencyHelper.setSession, 'function')
  })
})
