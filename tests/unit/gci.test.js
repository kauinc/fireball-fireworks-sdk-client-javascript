import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FireballGCI } from '../../src/gci/FireballGCI.js'
import { GCI_EVENTS } from '../../src/gci/gciEvents.js'

describe('FireballGCI', () => {
  it('dispatches game events on local bus', async () => {
    const gci = new FireballGCI()
    await gci.init({ environment: 'development' })

    let seen = null
    gci.addEventListener(GCI_EVENTS.FROM_GAME.READY_PLAY, (e) => {
      seen = e.detail?.name
    })
    gci.sendReadyToPlay()
    assert.equal(seen, GCI_EVENTS.FROM_GAME.READY_PLAY)
  })

  it('routes operator pause to handler', async () => {
    const gci = new FireballGCI()
    await gci.init({})
    let paused = null
    gci.onPauseGame = (v) => {
      paused = v
    }
    gci._parseReceivedEvent({
      name: GCI_EVENTS.TO_GAME.PAUSE_GAME,
      value: true,
    })
    assert.equal(paused, true)
  })
})
