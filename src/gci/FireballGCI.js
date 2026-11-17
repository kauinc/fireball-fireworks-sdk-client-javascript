import { FireballConfig } from '../core/FireballConfig.js'
import { createLogger } from '../tools/logger.js'
import { GCI_EVENTS, VisibilityOption } from './gciEvents.js'

/**
 * Lightweight EventTarget-compatible bus used when operator script is absent.
 */
function createBus() {
  const target = new EventTarget()
  return {
    dispatch(name, value = null) {
      target.dispatchEvent(
        new CustomEvent(name, {
          detail: { name, value },
        }),
      )
    },
    addEventListener(name, cb) {
      target.addEventListener(name, cb)
    },
    removeEventListener(name, cb) {
      target.removeEventListener(name, cb)
    },
  }
}

/**
 * Game Client Interface — bridge between game and operator page.
 * Compatible with Unity fireball-gci.js event names.
 */
export class FireballGCI {
  constructor() {
    this._logger = createLogger('GCI')
    this._bus = createBus()
    this._initialized = false
    this._initPromise = null
    this._operatorHandlersBound = false

    /** @type {((volume: number) => void)|null} */
    this.onAudioVolume = null
    /** @type {((enabled: boolean) => void)|null} */
    this.onBetTurbo = null
    /** @type {((betValue: number) => void)|null} */
    this.onBetPlace = null
    /** @type {((betValue: number) => void)|null} */
    this.onBetUpdate = null
    /** @type {(() => void)|null} */
    this.onBalanceUpdated = null
    /** @type {(() => void)|null} */
    this.onStopAutoplay = null
    /** @type {((opt: number) => void)|null} */
    this.onVisibleHelp = null
    /** @type {((opt: number) => void)|null} */
    this.onVisiblePaytable = null
    /** @type {(() => void)|null} */
    this.onConfirmedAction = null
    /** @type {((pause: boolean) => void)|null} */
    this.onPauseGame = null
    /** @type {(() => void)|null} */
    this.onCloseGame = null
  }

  get isInit() {
    return this._initialized
  }

  /**
   * Load operator launcher script (Unity jslib init) and subscribe to TO_GAME events.
   * Safe to call multiple times.
   * @param {{ environment?: string, operatorId?: string }} [opts]
   */
  async init(opts = {}) {
    if (this._initialized) return
    if (this._initPromise) return this._initPromise

    this._initPromise = this._doInit(opts)
    try {
      await this._initPromise
    } finally {
      this._initPromise = null
    }
  }

  async _doInit(opts) {
    this._logger.log('Init...')
    this._bindOperatorEventRouting()

    if (typeof document === 'undefined') {
      this._initialized = true
      this._logger.warning('No document — GCI running in headless/local bus mode')
      return
    }

    const environment =
      opts.environment ||
      new URLSearchParams(window.location.search).get('environment') ||
      'production'
    const operatorId =
      opts.operatorId ||
      new URLSearchParams(window.location.search).get('operatorId') ||
      ''

    let url = `${FireballConfig.URL_GCI_SCRIPTS}${environment}`
    if (operatorId) url = `${url}/${operatorId}`

    this._logger.log(`Init: Environment = ${environment}`)
    this._logger.log(`Init: OperatorId = ${operatorId}`)
    this._logger.log(`Init: Add script from URL = ${url}`)

    try {
      await loadScript(url)
      this._wireGlobalFireballGCI()
    } catch (e) {
      this._logger.warning(
        `Operator script failed to load (${e?.message ?? e}) — using local GCI bus`,
      )
      this._ensureGlobalShim()
    }

    this._initialized = true
  }

  _ensureGlobalShim() {
    if (typeof window === 'undefined') return
    if (window.fireballGCI) return

    const bus = this._bus
    const api = {
      addEventListener: (event, cb) => bus.addEventListener(event, cb),
      gameLoadingStarted: () => bus.dispatch(GCI_EVENTS.FROM_GAME.LOADING_STARTED),
      gameLoadingProgress: (p) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.LOADING_PROGRESS, p),
      gameLoadingComplete: () =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.LOADING_COMPLETE),
      gameReadyToPlay: () => bus.dispatch(GCI_EVENTS.FROM_GAME.READY_PLAY),
      gameAudioVolume: (v) => bus.dispatch(GCI_EVENTS.FROM_GAME.AUDIO_VOLUME, v),
      gameBetTurbo: (e) => bus.dispatch(GCI_EVENTS.FROM_GAME.BET_TURBO, e),
      gameBetPlaced: (v) => bus.dispatch(GCI_EVENTS.FROM_GAME.BET_PLACED, v),
      gameBetResult: (v) => bus.dispatch(GCI_EVENTS.FROM_GAME.BET_RESULT, v),
      gameBetUpdate: (v) => bus.dispatch(GCI_EVENTS.FROM_GAME.BET_UPDATE, v),
      gameBalanceUpdated: (v) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.BALANCE_UPDATED, v),
      gameJackpotUpdated: (v) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.JACKPOT_UPDATED, v),
      gameAutoplayStarted: () =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.AUTOPLAY_STARTED),
      gameAutoplayComplete: () =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.AUTOPLAY_COMPLETE),
      gameBonusFeatureStarted: (f) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.BONUS_FEATURE_STARTED, f),
      gameBonusFeatureComplete: (f) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.BONUS_FEATURE_COMPLETE, f),
      gameOpenUrl: (u) => bus.dispatch(GCI_EVENTS.FROM_GAME.OPEN_URL, u),
      gameSplashScreenVisible: (v) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.SPLASH_SCREEN_VISIBLE, v),
      gameConfirmVisible: (v) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.CONFIRM_VISIBLE, v),
      gameBuyFeatureVisible: (v) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.BUY_FEATURE_VISIBLE, v),
      gameOpenDepositMenu: () =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.OPEN_DEPOSIT_MENU),
      gameErrorMessage: (m) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.ERROR_MESSAGE, m),
      gameLockInteraction: (l) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.LOCK_INTERACTION, l),
      gameClosed: () => bus.dispatch(GCI_EVENTS.FROM_GAME.CLOSED),
      gameIntegrationError: (m) =>
        bus.dispatch(GCI_EVENTS.FROM_GAME.INTEGRATION_ERROR, m),
      operatorAudioVolume: (v) =>
        bus.dispatch(GCI_EVENTS.TO_GAME.AUDIO_VOLUME, v),
      operatorBetTurbo: (e) => bus.dispatch(GCI_EVENTS.TO_GAME.BET_TURBO, e),
      operatorBetPlace: (v) => bus.dispatch(GCI_EVENTS.TO_GAME.BET_PLACE, v),
      operatorBetUpdate: (v) => bus.dispatch(GCI_EVENTS.TO_GAME.BET_UPDATE, v),
      operatorUpdateBalance: () =>
        bus.dispatch(GCI_EVENTS.TO_GAME.UPDATE_BALANCE),
      operatorStopAutoplay: () =>
        bus.dispatch(GCI_EVENTS.TO_GAME.STOP_AUTOPLAY),
      operatorVisibleHelp: (v) =>
        bus.dispatch(GCI_EVENTS.TO_GAME.VISIBLE_HELP, v),
      operatorVisiblePaytable: (v) =>
        bus.dispatch(GCI_EVENTS.TO_GAME.VISIBLE_PAYTABLE, v),
      operatorConfirmedAction: () =>
        bus.dispatch(GCI_EVENTS.TO_GAME.CONFIRMED_ACTION),
      operatorPauseGame: (p) => bus.dispatch(GCI_EVENTS.TO_GAME.PAUSE_GAME, p),
      operatorCloseGame: () => bus.dispatch(GCI_EVENTS.TO_GAME.CLOSE_GAME),
    }

    window.fireballGCI = api
    window.FIREBALL_EVENTS = GCI_EVENTS
  }

  _wireGlobalFireballGCI() {
    if (typeof window === 'undefined') return
    if (!window.FIREBALL_EVENTS) window.FIREBALL_EVENTS = GCI_EVENTS
    if (!window.fireballGCI) {
      this._ensureGlobalShim()
      return
    }
    this._subscribeGlobalToGameEvents()
  }

  _subscribeGlobalToGameEvents() {
    if (typeof window === 'undefined' || !window.fireballGCI?.addEventListener) {
      return
    }
    if (this._operatorHandlersBound) return
    this._operatorHandlersBound = true

    const forward = (event) => this._parseReceivedEvent(event.detail ?? event)
    const events = GCI_EVENTS.TO_GAME
    for (const name of Object.values(events)) {
      window.fireballGCI.addEventListener(name, forward)
    }
  }

  _bindOperatorEventRouting() {
    // Local bus also receives operator_* when shim methods are used.
    for (const name of Object.values(GCI_EVENTS.TO_GAME)) {
      this._bus.addEventListener(name, (event) => {
        this._parseReceivedEvent(event.detail)
      })
    }
  }

  /**
   * @param {{ name?: string, value?: unknown }|null} eventData
   */
  _parseReceivedEvent(eventData) {
    try {
      this._logger.log(`ReceivedEvent: ${JSON.stringify(eventData)}`)
      const name = eventData?.name
      const value = eventData?.value
      switch (name) {
        case GCI_EVENTS.TO_GAME.AUDIO_VOLUME:
          this.onAudioVolume?.(Number(value ?? 0))
          break
        case GCI_EVENTS.TO_GAME.BET_TURBO:
          this.onBetTurbo?.(Boolean(value))
          break
        case GCI_EVENTS.TO_GAME.BET_PLACE:
          this.onBetPlace?.(Number(value ?? 0))
          break
        case GCI_EVENTS.TO_GAME.BET_UPDATE:
          this.onBetUpdate?.(Number(value ?? 0))
          break
        case GCI_EVENTS.TO_GAME.UPDATE_BALANCE:
          this.onBalanceUpdated?.()
          break
        case GCI_EVENTS.TO_GAME.STOP_AUTOPLAY:
          this.onStopAutoplay?.()
          break
        case GCI_EVENTS.TO_GAME.VISIBLE_HELP:
          this.onVisibleHelp?.(
            value != null ? Number(value) : VisibilityOption.Toggle,
          )
          break
        case GCI_EVENTS.TO_GAME.VISIBLE_PAYTABLE:
          this.onVisiblePaytable?.(
            value != null ? Number(value) : VisibilityOption.Toggle,
          )
          break
        case GCI_EVENTS.TO_GAME.CONFIRMED_ACTION:
          this.onConfirmedAction?.()
          break
        case GCI_EVENTS.TO_GAME.PAUSE_GAME:
          this.onPauseGame?.(Boolean(value))
          break
        case GCI_EVENTS.TO_GAME.CLOSE_GAME:
          this.onCloseGame?.()
          break
        default:
          this._logger.warning(`ReceivedEvent: undefined event with name - ${name}`)
      }
    } catch (e) {
      this._logger.error(`Events Receiver Exception: ${e}`)
    }
  }

  /**
   * Subscribe to any GCI event (from game or operator).
   * @param {string} eventName
   * @param {(event: CustomEvent) => void} callback
   */
  addEventListener(eventName, callback) {
    this._bus.addEventListener(eventName, callback)
    if (typeof window !== 'undefined' && window.fireballGCI?.addEventListener) {
      window.fireballGCI.addEventListener(eventName, callback)
    }
  }

  removeEventListener(eventName, callback) {
    this._bus.removeEventListener(eventName, callback)
  }

  // --- Game → Operator ---

  sendLoadingStarted() {
    this._send(GCI_EVENTS.FROM_GAME.LOADING_STARTED)
  }

  sendLoadingProgress(percent) {
    this._send(GCI_EVENTS.FROM_GAME.LOADING_PROGRESS, percent)
  }

  sendLoadingComplete() {
    this._send(GCI_EVENTS.FROM_GAME.LOADING_COMPLETE)
  }

  sendReadyToPlay() {
    this._send(GCI_EVENTS.FROM_GAME.READY_PLAY)
  }

  sendAudioVolume(percent) {
    this._send(GCI_EVENTS.FROM_GAME.AUDIO_VOLUME, percent)
  }

  sendBetTurbo(enabled) {
    this._send(GCI_EVENTS.FROM_GAME.BET_TURBO, enabled)
  }

  sendBetPlaced(betValue) {
    this._send(GCI_EVENTS.FROM_GAME.BET_PLACED, betValue)
  }

  sendBetResult(winValue) {
    this._send(GCI_EVENTS.FROM_GAME.BET_RESULT, winValue)
  }

  sendBetUpdate(betValue) {
    this._send(GCI_EVENTS.FROM_GAME.BET_UPDATE, betValue)
  }

  sendBalanceUpdated(balance) {
    this._send(GCI_EVENTS.FROM_GAME.BALANCE_UPDATED, balance)
  }

  sendJackpotUpdated(jackpotTemplateId, jackpotValue) {
    this._send(GCI_EVENTS.FROM_GAME.JACKPOT_UPDATED, {
      TemplateId: jackpotTemplateId,
      Value: jackpotValue,
    })
  }

  sendAutoplayStarted() {
    this._send(GCI_EVENTS.FROM_GAME.AUTOPLAY_STARTED)
  }

  sendAutoplayComplete() {
    this._send(GCI_EVENTS.FROM_GAME.AUTOPLAY_COMPLETE)
  }

  sendBonusFeatureStarted(feature) {
    this._send(GCI_EVENTS.FROM_GAME.BONUS_FEATURE_STARTED, feature)
  }

  sendBonusFeatureComplete(feature) {
    this._send(GCI_EVENTS.FROM_GAME.BONUS_FEATURE_COMPLETE, feature)
  }

  sendOpenUrl(url) {
    this._send(GCI_EVENTS.FROM_GAME.OPEN_URL, url)
  }

  sendSplashScreenVisible(visible) {
    this._send(GCI_EVENTS.FROM_GAME.SPLASH_SCREEN_VISIBLE, visible)
  }

  sendConfirmVisible(visible) {
    this._send(GCI_EVENTS.FROM_GAME.CONFIRM_VISIBLE, visible)
  }

  sendBuyFeatureVisible(visible) {
    this._send(GCI_EVENTS.FROM_GAME.BUY_FEATURE_VISIBLE, visible)
  }

  sendOpenDepositMenu() {
    this._send(GCI_EVENTS.FROM_GAME.OPEN_DEPOSIT_MENU)
  }

  sendErrorMessage(message) {
    this._send(GCI_EVENTS.FROM_GAME.ERROR_MESSAGE, message)
  }

  sendLockInteraction(locked) {
    this._send(GCI_EVENTS.FROM_GAME.LOCK_INTERACTION, locked)
  }

  sendGameClosed() {
    this._send(GCI_EVENTS.FROM_GAME.CLOSED)
  }

  sendIntegrationError(message) {
    this._send(GCI_EVENTS.FROM_GAME.INTEGRATION_ERROR, message)
  }

  /**
   * @param {string} eventName
   * @param {unknown} [eventValue]
   */
  _send(eventName, eventValue = null) {
    this._logger.log(`SendEvent: ${eventName} - ${JSON.stringify(eventValue)}`)
    this._bus.dispatch(eventName, eventValue)

    const gci =
      typeof window !== 'undefined' ? window.fireballGCI : null
    if (!gci) return

    const map = {
      [GCI_EVENTS.FROM_GAME.LOADING_STARTED]: () => gci.gameLoadingStarted?.(),
      [GCI_EVENTS.FROM_GAME.LOADING_PROGRESS]: () =>
        gci.gameLoadingProgress?.(eventValue),
      [GCI_EVENTS.FROM_GAME.LOADING_COMPLETE]: () => gci.gameLoadingComplete?.(),
      [GCI_EVENTS.FROM_GAME.READY_PLAY]: () => gci.gameReadyToPlay?.(),
      [GCI_EVENTS.FROM_GAME.AUDIO_VOLUME]: () =>
        gci.gameAudioVolume?.(eventValue),
      [GCI_EVENTS.FROM_GAME.BET_TURBO]: () => gci.gameBetTurbo?.(eventValue),
      [GCI_EVENTS.FROM_GAME.BET_PLACED]: () => gci.gameBetPlaced?.(eventValue),
      [GCI_EVENTS.FROM_GAME.BET_RESULT]: () => gci.gameBetResult?.(eventValue),
      [GCI_EVENTS.FROM_GAME.BET_UPDATE]: () => gci.gameBetUpdate?.(eventValue),
      [GCI_EVENTS.FROM_GAME.BALANCE_UPDATED]: () =>
        gci.gameBalanceUpdated?.(eventValue),
      [GCI_EVENTS.FROM_GAME.JACKPOT_UPDATED]: () =>
        gci.gameJackpotUpdated?.(eventValue),
      [GCI_EVENTS.FROM_GAME.AUTOPLAY_STARTED]: () => gci.gameAutoplayStarted?.(),
      [GCI_EVENTS.FROM_GAME.AUTOPLAY_COMPLETE]: () =>
        gci.gameAutoplayComplete?.(),
      [GCI_EVENTS.FROM_GAME.BONUS_FEATURE_STARTED]: () =>
        gci.gameBonusFeatureStarted?.(eventValue),
      [GCI_EVENTS.FROM_GAME.BONUS_FEATURE_COMPLETE]: () =>
        gci.gameBonusFeatureComplete?.(eventValue),
      [GCI_EVENTS.FROM_GAME.OPEN_URL]: () => gci.gameOpenUrl?.(eventValue),
      [GCI_EVENTS.FROM_GAME.SPLASH_SCREEN_VISIBLE]: () =>
        gci.gameSplashScreenVisible?.(eventValue),
      [GCI_EVENTS.FROM_GAME.CONFIRM_VISIBLE]: () =>
        gci.gameConfirmVisible?.(eventValue),
      [GCI_EVENTS.FROM_GAME.BUY_FEATURE_VISIBLE]: () =>
        gci.gameBuyFeatureVisible?.(eventValue),
      [GCI_EVENTS.FROM_GAME.OPEN_DEPOSIT_MENU]: () => gci.gameOpenDepositMenu?.(),
      [GCI_EVENTS.FROM_GAME.ERROR_MESSAGE]: () =>
        gci.gameErrorMessage?.(eventValue),
      [GCI_EVENTS.FROM_GAME.LOCK_INTERACTION]: () =>
        gci.gameLockInteraction?.(eventValue),
      [GCI_EVENTS.FROM_GAME.CLOSED]: () => gci.gameClosed?.(),
      [GCI_EVENTS.FROM_GAME.INTEGRATION_ERROR]: () =>
        gci.gameIntegrationError?.(eventValue),
    }

    const fn = map[eventName]
    if (fn) fn()
    else this._logger.warning(`Game Event with name = ${eventName} not found`)
  }
}

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () =>
      reject(new Error(`Failed to load script: ${url}`)),
    )
    document.body.appendChild(script)
  })
}

let sharedGci = null

/** @returns {FireballGCI} */
export function getFireballGCI() {
  if (!sharedGci) sharedGci = new FireballGCI()
  return sharedGci
}
