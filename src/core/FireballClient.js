import { Communicator } from '../communicator/Communicator.js'
import { getFireballGCI } from '../gci/FireballGCI.js'
import { SignalRMessenger } from '../messenger/SignalRMessenger.js'
import { Translation } from '../modules/Translation.js'
import { Transactions } from '../modules/Transactions.js'
import { AuthRequest } from '../models/AuthRequest.js'
import { AuthResponse, parseAuthResponse } from '../models/AuthResponse.js'
import { BalanceRequest } from '../models/BalanceRequest.js'
import { parseBalanceResponse } from '../models/BalanceResponse.js'
import {
  ErrorResponse,
  isErrorPayload,
  parseErrorResponse,
} from '../models/ErrorResponse.js'
import { PingRequest } from '../models/PingRequest.js'
import { ServerMessage } from '../models/ServerMessage.js'
import {
  NetworkChecker,
  onTabVisibility,
} from '../network/NetworkChecker.js'
import { CurrencyHelper } from '../tools/CurrencyHelper.js'
import { generateConnectionToken } from '../tools/ids.js'
import { createLogger, setLogLevel } from '../tools/logger.js'
import { parseSessionFromUrl, URL_PARAMS } from '../tools/urlData.js'
import { FireballConfig, GameMode, LogLevels } from './FireballConfig.js'
import { settingsToSession } from './FireballSettings.js'

const RESEND_FAILED_REQUEST_ACTION = 'resend-failed-request'
const JACKPOT_MESSAGE_NAME = 'jackpot-update'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Framework-agnostic Fireball RGS client (Unity Fireball equivalent).
 */
export class FireballClient {
  constructor() {
    this._logger = createLogger()
    this._communicator = new Communicator()
    this._networkChecker = new NetworkChecker(500)
    this._gci = getFireballGCI()
    /** @type {Translation|null} */
    this._translation = null
    /** @type {Transactions|null} */
    this._transactions = null
    this._messenger = null
    this._currentSession = null
    this._customRouterUrl = ''
    this._lastActionID = ''
    this._lastFailedActionID = null
    this._networkWasDown = false
    this._pendingRequests = new Map()
    this._pendingResponses = new Map()
    this._authorizingParams = null
    this._unsubscribeVisibility = null
    this._events = new EventTarget()

    this._messenger = new SignalRMessenger({
      getSession: () => this._currentSession,
      delay: sleep,
      isNetworkConnected: () => this._networkChecker.isConnected,
    })
  }

  get session() {
    return this._currentSession
  }

  /** @deprecated use session */
  get currentSession() {
    return this._currentSession
  }

  get gci() {
    return this._gci
  }

  /** Lazy Translation API module (Unity Fireball.Translation equivalent). */
  get translation() {
    if (!this._translation) {
      this._translation = new Translation(this._communicator, this._logger)
    }
    return this._translation
  }

  /** Lazy Transactions / replay API (Unity GetTransactionsList / GetReplaysList). */
  get transactions() {
    if (!this._transactions) {
      this._transactions = new Transactions(
        this._communicator,
        () => this._currentSession,
        () => this.isAuth,
        this._logger,
      )
    }
    return this._transactions
  }

  /**
   * @param {{ startIndex?: number, includeGameStates?: boolean }} [options]
   * @returns {Promise<import('../models/Transaction.js').TransactionsList>}
   */
  getTransactionsList(options) {
    return this.transactions.getTransactionsList(options)
  }

  /**
   * @param {string} shortReplayId
   * @returns {Promise<import('../models/Transaction.js').Transaction[]>}
   */
  getReplaysList(shortReplayId) {
    return this.transactions.getReplaysList(shortReplayId)
  }

  get lastActionId() {
    return this._lastActionID
  }

  get isConnected() {
    return Boolean(this._messenger?.isConnected)
  }

  get isInit() {
    return Boolean(
      this._currentSession?.connectionId && this._messenger?.isInit,
    )
  }

  get isAuth() {
    if (!this._currentSession) return false
    const hasGame =
      Boolean(this._currentSession.gameSession) &&
      Boolean(this._currentSession.playerId)
    return hasGame || Boolean(this._currentSession.operatorPlayerSession)
  }

  get isDemo() {
    return (
      this._currentSession?.gameSession === FireballConfig.DEMO_SESSION ||
      this._currentSession?.gameMode?.toLowerCase() === GameMode.fun
    )
  }

  get network() {
    return this._networkChecker
  }

  /**
   * @param {string} eventName connectionError | serverMessage | jackpotUpdate
   * @param {(event: CustomEvent) => void} handler
   */
  on(eventName, handler) {
    this._events.addEventListener(eventName, handler)
    return () => this._events.removeEventListener(eventName, handler)
  }

  off(eventName, handler) {
    this._events.removeEventListener(eventName, handler)
  }

  /**
   * @param {string} type
   * @param {unknown} detail
   */
  _emit(type, detail) {
    this._events.dispatchEvent(new CustomEvent(type, { detail }))
  }

  /**
   * @param {import('./FireballSettings.js').FireballSettingsInput|string|undefined} [settingsOrUrl]
   * @returns {Promise<import('./FireballSession.js').FireballSession>}
   */
  async init(settingsOrUrl) {
    let session
    if (settingsOrUrl == null) {
      session = parseSessionFromUrl()
    } else if (typeof settingsOrUrl === 'string') {
      session = parseSessionFromUrl(settingsOrUrl)
    } else {
      session = settingsToSession(settingsOrUrl)
    }
    return this._initialize(session)
  }

  /**
   * @param {import('./FireballSession.js').FireballSession} customSession
   */
  async _initialize(customSession) {
    this._logger.log('Init...')
    this._currentSession = customSession
    this._currentSession.connectionToken = generateConnectionToken()
    this._customRouterUrl = this._currentSession.router

    this._messenger.onMessageReceived = (json) => this._onMessageReceived(json)
    this._messenger.onConnectionChange = (isConnected, connectionId) =>
      this._onMessengerConnectionChange(isConnected, connectionId)
    this._messenger.onConnectionError = (error) =>
      this._onMessengerConnectionError(error)

    this._networkChecker.startNetworkCheck()
    this._networkChecker.onNetworkConnectionChanged = (connected) =>
      this._onInternetConnection(connected)

    if (this._unsubscribeVisibility) this._unsubscribeVisibility()
    this._unsubscribeVisibility = onTabVisibility((visible) =>
      this._onTabVisibility(visible),
    )

    // GCI init is best-effort; do not block RGS connect.
    this._gci
      .init({
        environment: this._currentSession.environment,
        operatorId: this._currentSession.operatorId,
      })
      .catch((e) => this._logger.warning(`GCI init: ${e?.message ?? e}`))

    const connectionId = await this._messenger.connect(
      this._currentSession.wsServer,
      this._currentSession.connectionToken,
    )
    this._currentSession.connectionId = connectionId
    this._logger.info('OnInit: Success!')
    return this._currentSession
  }

  get _urlRouter() {
    return this._customRouterUrl || FireballConfig.URL_ROUTER_DEFAULT
  }

  /**
   * @param {AuthRequest|null} [authRequest]
   * @param {{ timeout?: number, attempts?: number }} [opts]
   * @returns {Promise<AuthResponse>}
   */
  async authorize(authRequest = null, opts = {}) {
    const request =
      authRequest ?? new AuthRequest(this._currentSession)
    const timeout = opts.timeout ?? 0
    const attempts = opts.attempts ?? 1

    this._authorizingParams = { request, timeout, attempts }

    try {
      const response = await this.sendRequest(request, { timeout, attempts })
      const auth = parseAuthResponse(response)

      this._authorizingParams = null
      if (!this._currentSession) throw ErrorResponse.customError(request.ActionId, 'No session')

      this._currentSession.gameSession = auth.GameSession ?? this._currentSession.gameSession
      this._currentSession.playerId = auth.PlayerId ?? this._currentSession.playerId
      this._currentSession.operatorPlayerId =
        auth.OperatorPlayerId ?? this._currentSession.operatorPlayerId
      this._currentSession.operatorPlayerSession =
        auth.OperatorPlayerSession ?? this._currentSession.operatorPlayerSession

      if (auth.Extra) {
        this._currentSession.extra = {
          ...(this._currentSession.extra ?? {}),
          ...auth.Extra,
        }
      }

      if (auth.Currency && this._currentSession.currency !== auth.Currency) {
        this._logger.warning(
          `Currency changed: ${this._currentSession.currency} -> ${auth.Currency}`,
        )
        this._currentSession.currency = auth.Currency
        if (this._currentSession.extra?.[URL_PARAMS.CURRENCY] != null) {
          this._currentSession.extra[URL_PARAMS.CURRENCY] = auth.Currency
        }
      }

      if (auth.Multiplier != null) {
        this._currentSession.multiplier = auth.Multiplier
      }

      CurrencyHelper.setSession(this._currentSession)
      return auth
    } catch (e) {
      throw e
    }
  }

  /**
   * @param {{ currency?: string, balance?: number }} [opts]
   * @returns {Promise<AuthResponse>}
   */
  async demoAuthorize(opts = {}) {
    const currency = opts.currency ?? FireballConfig.DEFAULT_CURRENCY
    const balance = opts.balance ?? FireballConfig.DEMO_BALANCE

    try {
      if (!this._currentSession) {
        const { FireballSession } = await import('./FireballSession.js')
        this._currentSession = new FireballSession()
      }

      this._currentSession.gameMode = GameMode.fun
      this._currentSession.gameSession = FireballConfig.DEMO_SESSION
      this._currentSession.playerId = FireballConfig.DEMO_USER_ID

      const response = new AuthResponse({
        ActionId: generateLocalId(),
        MessageTimestamp: Date.now(),
        ConnectionId: this._currentSession.connectionId,
        Balance: balance,
        Currency: currency,
        GameMode: this._currentSession.gameMode,
        Environment: this._currentSession.environment,
        GameId: this._currentSession.gameId,
        PlayerId: this._currentSession.playerId,
        GameSession: this._currentSession.gameSession,
        OperatorId: this._currentSession.operatorId,
        OperatorPlayerId: this._currentSession.operatorPlayerId,
        OperatorPlayerSession: this._currentSession.operatorPlayerSession,
        Extra: this._currentSession.extra,
      })

      CurrencyHelper.setSession(this._currentSession)
      return response
    } catch (e) {
      throw ErrorResponse.customError(null, String(e), 0)
    }
  }

  /**
   * @param {BalanceRequest|null} [request]
   * @param {{ timeout?: number, attempts?: number }} [opts]
   */
  async getBalance(request = null, opts = {}) {
    const req = request ?? new BalanceRequest(this._currentSession)
    const raw = await this.sendRequest(req, opts)
    return parseBalanceResponse(raw)
  }

  sendPing() {
    return this._communicator.sendPOST(
      this._urlRouter,
      new PingRequest(this._currentSession),
    )
  }

  /**
   * POST to router, wait for WS response matched by ActionId.
   * @param {import('../models/BaseMessage.js').BaseMessage|Record<string, unknown>} request
   * @param {{ timeout?: number, attempts?: number }} [opts]
   * @returns {Promise<Record<string, unknown>>}
   */
  async sendRequest(request, opts = {}) {
    const timeout = opts.timeout ?? FireballConfig.DEFAULT_TIMEOUT
    const attemptsCount = opts.attempts ?? 1

    // Wait for reconnect if needed
    if (!this._messenger?.isConnected) {
      this._logger.warning(
        `SendRequest: not connected, waiting for reconnect... (${request.Name})`,
      )
      const ok = await this._waitUntil(
        () => this._messenger?.isConnected,
        35_000,
        250,
      )
      if (!ok) {
        this._logger.error(`SendRequest: reconnect timeout (${request.Name})`)
        throw ErrorResponse.customError(
          request.ActionId,
          'Fail to connect to server',
        )
      }
      this._logger.log(`SendRequest: reconnected, sending (${request.Name})`)
    }

    this._lastFailedActionID = null
    this._lastActionID = request.ActionId
    this._pendingRequests.set(request.ActionId, request.Name)

    let connectionId = this._messenger.connectionId
    if (request.ConnectionId !== connectionId) {
      this._logger.log(
        `Connection Id different from messengers! Changing Connection Id: ${request.ConnectionId} -> ${connectionId}`,
      )
      request.ConnectionId = connectionId
      if (this._currentSession) this._currentSession.connectionId = connectionId
    }

    if (!this._isPendingResponse(request.ActionId)) {
      await this._postAndWaitForResponse(request, {
        timeout,
        attemptsCount,
        connectionId,
      })
    } else {
      this._logger.log('Found Pending Response!')
    }

    const responseObject = this._getPendingResponse(request.ActionId)
    try {
      if (isErrorPayload(responseObject)) {
        this._lastFailedActionID = request.ActionId
        const error = parseErrorResponse(responseObject)
        this._logger.error(
          `Message - ${error.Name} - Error (ActionId: ${error.ActionId})\nError: ${error.toJson()}`,
        )
        const script = error.Error?.ClientScript?.Value ?? error.Error?.ClientScript?.value
        if (script != null) {
          this._gci.sendIntegrationError(script)
        }
        throw error
      }

      this._logger.info(
        `Message - ${responseObject?.Name ?? responseObject?.name} - Received (ActionId: ${responseObject?.ActionId ?? responseObject?.actionId})`,
      )
      this._lastFailedActionID = null
      return responseObject
    } finally {
      this._pendingRequests.delete(request.ActionId)
      this._pendingResponses.delete(request.ActionId)
      this._checkAndClearPendingResponses()
    }
  }

  /**
   * @param {import('../models/BaseMessage.js').BaseMessage} request
   * @param {{ timeout: number, attemptsCount: number, connectionId: string }} ctx
   */
  async _postAndWaitForResponse(request, ctx) {
    let timePassed = 0
    let attemptsLeft = ctx.attemptsCount - 1
    let connectionId = ctx.connectionId
    let isPostNetworkError = false
    let networkErrorWait = 0
    let globalElapsed = 0
    let graceTimer = 0
    let postResends = 0

    const NETWORK_ERROR_WAIT_MAX = 35
    const GLOBAL_TIMEOUT = 120
    const RECONNECT_GRACE = 7
    const MAX_POST_RESENDS = 1
    const tick = 0.25

    const postErrorCallback = (errorReason) => {
      isPostNetworkError = true
      networkErrorWait = 0
      this._logger.warning(
        `POST transport error '${errorReason}' (WS=${this._messenger?.isConnected}, net=${this._networkChecker.isConnected}) — waiting for server response (${request.Name})`,
      )
      this._messenger?.forceReconnect().catch(() => {})
    }

    try {
      await this._communicator.sendPOST(this._urlRouter, request)
    } catch (e) {
      postErrorCallback(e?.message ?? String(e))
    }

    while (!this._isPendingResponse(request.ActionId)) {
      if (globalElapsed >= GLOBAL_TIMEOUT) {
        this._logger.error(
          `SendRequest: global timeout (${GLOBAL_TIMEOUT}s) exceeded for (${request.Name})`,
        )
        this._addPendingResponse(
          request.ActionId,
          ErrorResponse.timeoutResponse(request.ActionId, GLOBAL_TIMEOUT).toJSON(),
        )
        break
      }

      if (isPostNetworkError) {
        const healthy = Boolean(this._messenger?.isConnected)
        if (!healthy) {
          if (networkErrorWait >= NETWORK_ERROR_WAIT_MAX) {
            this._logger.error(
              `Network error: no reconnect after ${networkErrorWait}s (${request.Name})`,
            )
            this._addPendingResponse(
              request.ActionId,
              ErrorResponse.customError(
                request.ActionId,
                'Fail to connect to server',
              ).toJSON(),
            )
          } else {
            await sleep(tick * 1000)
            networkErrorWait += tick
            globalElapsed += tick
            graceTimer = 0
          }
        } else if (graceTimer < RECONNECT_GRACE) {
          await sleep(tick * 1000)
          graceTimer += tick
          globalElapsed += tick
        } else if (postResends < MAX_POST_RESENDS) {
          postResends += 1
          const resendConnId = this._messenger.connectionId
          if (resendConnId) {
            request.ConnectionId = resendConnId
            connectionId = resendConnId
            if (this._currentSession) {
              this._currentSession.connectionId = resendConnId
            }
          }
          this._logger.log(
            `No response ${graceTimer}s after reconnect — resending POST (attempt ${postResends}/${MAX_POST_RESENDS}) (${request.Name})`,
          )
          graceTimer = 0
          networkErrorWait = 0
          isPostNetworkError = false
          try {
            await this._communicator.sendPOST(this._urlRouter, request)
          } catch (e) {
            postErrorCallback(e?.message ?? String(e))
          }
        } else {
          this._logger.error(
            `No response after ${postResends} post-reconnect resend(s) (${request.Name})`,
          )
          this._addPendingResponse(
            request.ActionId,
            ErrorResponse.customError(
              request.ActionId,
              'Fail to connect to server',
            ).toJSON(),
          )
        }
      } else if (ctx.timeout > 0 && timePassed >= ctx.timeout) {
        if (attemptsLeft > 0) {
          attemptsLeft -= 1
          timePassed = 0
          this._logger.warning(
            `Timeout! Try next attempt... (${ctx.attemptsCount - attemptsLeft})`,
          )
          try {
            await this._communicator.sendPOST(this._urlRouter, request)
          } catch (e) {
            postErrorCallback(e?.message ?? String(e))
          }
        } else {
          this._logger.error(
            `Timeout for message ${request.Name} ${request.ActionId}! Time passed: ${timePassed} sec`,
          )
          this._addPendingResponse(
            request.ActionId,
            ErrorResponse.timeoutResponse(
              request.ActionId,
              ctx.timeout,
            ).toJSON(),
          )
        }
      } else {
        const currentConnId = this._messenger?.connectionId
        if (currentConnId && currentConnId !== connectionId) {
          this._logger.log(
            `ConnectionId changed while waiting: ${connectionId} -> ${currentConnId}`,
          )
          connectionId = currentConnId
          if (this._currentSession) {
            this._currentSession.connectionId = connectionId
          }
        }
        await sleep(tick * 1000)
        timePassed += tick
        globalElapsed += tick
      }
    }
  }

  async resendFailedRequest() {
    if (
      this._lastFailedActionID != null &&
      this._lastFailedActionID !== RESEND_FAILED_REQUEST_ACTION
    ) {
      this._lastFailedActionID = RESEND_FAILED_REQUEST_ACTION
      return true
    }
    this._logger.warning('No failed requests found...')
    return false
  }

  goHomePage() {
    if (!this._currentSession?.homeUrl) {
      this._logger.warning(
        'Home param were not provided in game URL! Trying close game by sending event to operators page...',
      )
      this._gci.sendGameClosed()
      return
    }
    if (typeof window !== 'undefined') {
      window.location.href = this._currentSession.homeUrl
    }
  }

  async dispose() {
    if (this._unsubscribeVisibility) {
      this._unsubscribeVisibility()
      this._unsubscribeVisibility = null
    }
    this._networkChecker.stopNetworkCheck()
    this._networkChecker.onNetworkConnectionChanged = null
    if (this._messenger) {
      await this._messenger.disconnect()
    }
  }

  _onInternetConnection(connected) {
    if (!this.isInit && !connected) return

    if (!connected) {
      this._networkWasDown = true
      this._emit('connectionError', 'Connection lost...')
      return
    }

    if (this._messenger && (!this._messenger.isConnected || this._networkWasDown)) {
      this._networkWasDown = false
      this._logger.log(
        `OnInternetConnection: network restored (WS connected=${this._messenger.isConnected}), forcing reconnect.`,
      )
      this._messenger.forceReconnect().catch((err) => {
        this._emit('connectionError', err?.message ?? String(err))
      })
    }
  }

  _onMessengerConnectionChange(isConnected, connectionId) {
    if (isConnected && this._currentSession?.connectionId !== connectionId) {
      this._currentSession.connectionId = connectionId

      if (this._authorizingParams) {
        this._logger.info(`Continue Auth with new connectionId = ${connectionId}`)
        this._authorizingParams.request.ConnectionId = connectionId
        this.authorize(this._authorizingParams.request, {
          timeout: this._authorizingParams.timeout,
          attempts: this._authorizingParams.attempts,
        }).catch((e) => {
          this._logger.error(`Continue Auth failed: ${e?.Reason ?? e?.message ?? e}`)
        })
      }
    }
  }

  _onMessengerConnectionError(error) {
    if (!this._networkChecker.isConnected) {
      this._logger.error(`Messenger Error: ${error}`)
    }
    this._emit('connectionError', error)
  }

  _onTabVisibility(visible) {
    if (!visible) return
    if (!this._messenger?.isConnected) {
      this._logger.log(
        'Tab focused: connection lost, attempting silent reconnect...',
      )
      this._messenger
        ?.forceReconnect()
        .then((id) => this._logger.log(`Tab reconnect success: ${id}`))
        .catch((err) => {
          this._logger.error(`Tab reconnect failed: ${err?.message ?? err}`)
          this._emit('connectionError', err?.message ?? String(err))
        })
    }
  }

  _onMessageReceived(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json
      if (!data) {
        this._logger.error("On Message error: can't parse json!")
        return
      }

      const actionId = data.ActionId ?? data.actionId
      const messageObject = data.Message ?? data.message
      const name =
        messageObject?.Name ??
        messageObject?.name ??
        null

      if (name === JACKPOT_MESSAGE_NAME) {
        this._logger.info(`On Jackpot Message Received: ${JSON.stringify(messageObject)}`)
        this._emit('jackpotUpdate', messageObject)
        return
      }

      if (!actionId) {
        this._logger.error('On Message error: actionID == null!')
        this._addPendingResponse(this._lastActionID, messageObject)
        return
      }

      this._addPendingResponse(actionId, messageObject)

      const serverMessage = new ServerMessage(actionId, name, messageObject)
      // Always notify (Unity OnServerMessageReceived). Games can ignore
      // messages that match their own pending sendRequest.
      this._emit('serverMessage', serverMessage)
      if (!this._pendingRequests.has(actionId)) {
        this._emit('broadcastMessage', serverMessage)
      }
    } catch (e) {
      this._logger.error(`On Message error: can't parse json! Exception: ${e}`)
    }
  }

  _isPendingResponse(actionID) {
    if (this._pendingResponses.has(actionID)) return true
    for (const key of this._pendingResponses.keys()) {
      if (key.includes(actionID) || actionID.includes(key)) return true
    }
    return false
  }

  _getPendingResponse(actionID) {
    if (this._pendingResponses.has(actionID)) {
      return this._pendingResponses.get(actionID)
    }
    for (const [id, value] of this._pendingResponses.entries()) {
      if (id.includes(actionID) || actionID.includes(id)) return value
    }
    return null
  }

  _addPendingResponse(actionID, response) {
    this._pendingResponses.set(actionID, response)
  }

  _checkAndClearPendingResponses() {
    const orphaned = []
    for (const actionID of this._pendingResponses.keys()) {
      if (!this._pendingRequests.has(actionID)) orphaned.push(actionID)
    }
    if (orphaned.length > 0) {
      this._logger.log(`Clearing Pending response = ${orphaned.join(',')}`)
      for (const id of orphaned) this._pendingResponses.delete(id)
    }
  }

  /**
   * @param {() => boolean} predicate
   * @param {number} maxMs
   * @param {number} stepMs
   */
  async _waitUntil(predicate, maxMs, stepMs) {
    let waited = 0
    while (!predicate() && waited < maxMs) {
      await sleep(stepMs)
      waited += stepMs
    }
    return predicate()
  }
}

function generateLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return String(Date.now())
}

/** @type {FireballClient|null} */
let sharedInstance = null

/** Singleton-style accessor (Unity Fireball.Instance). */
export function getFireballClient() {
  if (!sharedInstance) sharedInstance = new FireballClient()
  return sharedInstance
}

export function setFireballLogLevel(level) {
  setLogLevel(level ?? LogLevels.Information)
}
