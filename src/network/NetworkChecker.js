import { createLogger } from '../tools/logger.js'

/**
 * Browser online/offline + optional polling (Unity NetworkChecker).
 */
export class NetworkChecker {
  /**
   * @param {number} [checkIntervalMs=500]
   */
  constructor(checkIntervalMs = 500) {
    this._logger = createLogger('Network')
    this._checkIntervalMs = checkIntervalMs
    /** @type {boolean|null} */
    this._isNetworkConnected = null
    this._timer = null
    this._onOnline = () => this._checkConnection()
    this._onOffline = () => this._checkConnection()
    /** @type {((connected: boolean) => void)|null} */
    this.onNetworkConnectionChanged = null
  }

  get isConnected() {
    if (this._isNetworkConnected == null) return this._readOnline()
    return this._isNetworkConnected
  }

  startNetworkCheck() {
    this.stopNetworkCheck()
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this._onOnline)
      window.addEventListener('offline', this._onOffline)
    }
    this._checkConnection()
    this._timer = setInterval(() => this._checkConnection(), this._checkIntervalMs)
  }

  stopNetworkCheck() {
    if (this._timer != null) {
      clearInterval(this._timer)
      this._timer = null
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._onOnline)
      window.removeEventListener('offline', this._onOffline)
    }
  }

  _readOnline() {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine
    }
    return true
  }

  _checkConnection() {
    const connected = this._readOnline()
    if (this._isNetworkConnected == null) {
      this._logger.log(`is connected = ${connected}`)
      this._isNetworkConnected = connected
      return
    }
    if (this._isNetworkConnected !== connected) {
      this._logger.log(`Connection Changed: connected = ${connected}`)
      this._isNetworkConnected = connected
      this.onNetworkConnectionChanged?.(connected)
    }
  }
}

/**
 * Subscribe to document visibility; returns unsubscribe.
 * @param {(visible: boolean) => void} callback
 */
export function onTabVisibility(callback) {
  if (typeof document === 'undefined') {
    return () => {}
  }
  const handler = () => {
    callback(document.visibilityState !== 'hidden')
  }
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}
