import * as signalR from '@microsoft/signalr'
import { createLogger } from '../tools/logger.js'
import { formatUrlAndParams } from '../tools/ids.js'

const MESSAGE_RECEIVE = 'ReceiveMessage'
const MESSAGE_ACKNOWLEDGE = 'AcknowledgeMessage'
const RECONNECT_MAX = 7

export class SignalRMessenger {
  /**
   * @param {{
   *   getSession: () => import('../core/FireballSession.js').FireballSession|null,
   *   delay: (ms: number) => Promise<void>,
   *   isNetworkConnected: () => boolean,
   * }} deps
   */
  constructor(deps) {
    this._deps = deps
    this._logger = createLogger('SignalR')
    this._connection = null
    this._serverURL = ''
    this._connectionToken = ''
    this._reconnectAttempt = 0
    this._isDisconnecting = false
    this._isReconnecting = false
    this._isConnecting = false
    this._onConnectSuccess = null
    this._onConnectFail = null

    /** @type {((isConnected: boolean, connectionId: string) => void)|null} */
    this.onConnectionChange = null
    /** @type {((message: string) => void)|null} */
    this.onMessageReceived = null
    /** @type {((error: string) => void)|null} */
    this.onConnectionError = null
  }

  get isInit() {
    return this._connection != null
  }

  get isConnected() {
    return (
      this._connection != null &&
      this._connection.state === signalR.HubConnectionState.Connected
    )
  }

  get isClosed() {
    return (
      this._connection == null ||
      this._connection.state === signalR.HubConnectionState.Disconnected
    )
  }

  get connectionId() {
    return this._connection?.connectionId ?? ''
  }

  /**
   * @param {string} server
   * @param {string} connectionToken
   * @returns {Promise<string>} connectionId
   */
  connect(server, connectionToken) {
    return new Promise((resolve, reject) => {
      if (!server) {
        const err = "Can't connect! Server = null"
        this._logger.error(err)
        reject(new Error(err))
        return
      }
      if (!connectionToken) {
        const err = "Can't connect! ConnectionToken = null"
        this._logger.error(err)
        reject(new Error(err))
        return
      }

      this._startConnect(server, connectionToken, resolve, reject).catch(reject)
    })
  }

  /**
   * @param {string} server
   * @param {string} connectionToken
   * @param {(id: string) => void} onSuccess
   * @param {(err: Error) => void} onFail
   */
  async _startConnect(server, connectionToken, onSuccess, onFail) {
    await this._teardownConnection(true)

    this._isConnecting = true
    this._onConnectSuccess = onSuccess
    this._onConnectFail = onFail
    this._serverURL = server
    this._connectionToken = connectionToken

    const session = this._deps.getSession()
    const serverUrlFull = formatUrlAndParams(server, {
      EIO: '4',
      transport: 'websocket',
      connectionToken,
      environment: session?.environment,
      operatorId: session?.operatorId,
      gameId: session?.gameId,
    })

    this._logger.log(`Connecting... server = ${serverUrlFull}`)

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(serverUrlFull, {
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect(false)
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.on(MESSAGE_RECEIVE, (message) => this._onMessage(message))
    connection.onclose((err) => this._onClose(err))

    this._connection = connection

    try {
      await connection.start()
      this._reconnectAttempt = 0
      this._isReconnecting = false
      this._isConnecting = false
      this._isDisconnecting = false
      const id = connection.connectionId ?? ''
      this._logger.log(`Connected - ${id}`)
      this.onConnectionChange?.(true, id)
      const success = this._onConnectSuccess
      this._onConnectSuccess = null
      this._onConnectFail = null
      success?.(id)
    } catch (e) {
      this._isConnecting = false
      this._isReconnecting = false
      const msg = e?.message ?? String(e)
      this._logger.error(`Exception! ${msg}`)
      const fail = this._onConnectFail
      this._onConnectSuccess = null
      this._onConnectFail = null
      fail?.(e instanceof Error ? e : new Error(msg))
    }
  }

  /**
   * Soft reconnect with exponential backoff.
   * @returns {Promise<string>}
   */
  reconnect() {
    if (this._isReconnecting || this._isConnecting) {
      this._logger.log(
        `Reconnect: skipping — isReconnecting=${this._isReconnecting}, isConnecting=${this._isConnecting}.`,
      )
      return Promise.reject(new Error('Reconnect already in progress'))
    }
    if (!this._deps.isNetworkConnected()) {
      this._logger.warning('Reconnect: no network — will retry when network restores.')
      return Promise.reject(new Error('No network'))
    }
    return this._scheduleReconnect(false)
  }

  /**
   * Reset backoff and reconnect.
   * @returns {Promise<string>}
   */
  forceReconnect() {
    if (this._isReconnecting || this._isConnecting) {
      this._logger.log(
        `ForceReconnect: skipping — isReconnecting=${this._isReconnecting}, isConnecting=${this._isConnecting}.`,
      )
      return Promise.reject(new Error('Reconnect already in progress'))
    }
    this._logger.log(
      `ForceReconnect: resetting backoff (was attempt ${this._reconnectAttempt}).`,
    )
    this._reconnectAttempt = 0
    return this._scheduleReconnect(true)
  }

  async disconnect() {
    this._isDisconnecting = true
    await this._teardownConnection(false)
  }

  async _teardownConnection(forReconnect) {
    if (!this._connection) return
    const conn = this._connection
    try {
      if (conn.state === signalR.HubConnectionState.Connected) {
        this._logger.log(
          forReconnect
            ? 'Closing old connection before reconnect...'
            : 'Disconnecting...',
        )
        this._isDisconnecting = true
        await conn.stop()
      }
    } catch (e) {
      this._logger.warning(`teardown: ${e?.message ?? e}`)
    } finally {
      try {
        conn.off(MESSAGE_RECEIVE)
      } catch {
        /* ignore */
      }
      if (this._connection === conn) this._connection = null
    }
  }

  /**
   * @param {boolean} _force
   * @returns {Promise<string>}
   */
  async _scheduleReconnect(_force) {
    if (this._reconnectAttempt >= RECONNECT_MAX) {
      this._isReconnecting = false
      this._reconnectAttempt = 0
      const msg = `Server Unavailable after ${RECONNECT_MAX} reconnect attempts`
      this._logger.error(`Can't Reconnect after ${RECONNECT_MAX} attempts.`)
      this.onConnectionError?.(msg)
      throw new Error(msg)
    }

    this._isReconnecting = true
    const delaySec = 2 ** this._reconnectAttempt
    this._logger.log(
      `Reconnecting in ${delaySec.toFixed(1)}s... (${this._reconnectAttempt + 1}/${RECONNECT_MAX})`,
    )
    await this._deps.delay(delaySec * 1000)
    this._reconnectAttempt += 1
    this._isReconnecting = false

    const capturedUrl = this._serverURL
    const capturedToken = this._connectionToken
    return this.connect(capturedUrl, capturedToken)
  }

  _onClose(err) {
    this._isConnecting = false
    const id = this.connectionId
    this._logger.log(
      `Disconnected - ${id} ${this._isDisconnecting ? '(Normal)' : '(Abnormal)'}`,
    )
    this.onConnectionChange?.(false, id)

    if (this._isDisconnecting) {
      this._isDisconnecting = false
      return
    }

    if (err) {
      this._logger.error(`Error - ${err.message ?? err}`)
    }

    this.reconnect().catch((e) => {
      this._logger.error(`Can't reconnect: ${e?.message ?? e}`)
      this.onConnectionError?.(e?.message ?? String(e))
    })
  }

  _onMessage(message) {
    let payload = message
    if (typeof message === 'string') {
      try {
        payload = JSON.parse(message)
      } catch {
        this.onMessageReceived?.(message)
        return
      }
    }

    const wsMessageId = payload?.WsMessageId ?? payload?.wsMessageId
    if (wsMessageId) {
      this._sendAcknowledge(wsMessageId)
    }

    const raw =
      typeof message === 'string' ? message : JSON.stringify(message)
    this.onMessageReceived?.(raw)
  }

  async _sendAcknowledge(wsMessageId) {
    try {
      if (!this._connection || !this.isConnected) {
        this._logger.error(
          `SendAcknowledge: not connected, skip ${wsMessageId}`,
        )
        return
      }
      await this._connection.invoke(MESSAGE_ACKNOWLEDGE, wsMessageId)
    } catch (ex) {
      this._logger.error(`AcknowledgeMessage failed: ${ex?.message ?? ex}`)
    }
  }
}
