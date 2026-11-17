import { FireballConfig, GameMode } from './FireballConfig.js'

/**
 * @typedef {Object} FireballSessionData
 * @property {string} [gameMode]
 * @property {string} [environment]
 * @property {string} [operatorId]
 * @property {string} [operatorPlayerSession]
 * @property {string} [operatorPlayerId]
 * @property {string} [gameId]
 * @property {string} [playerId]
 * @property {string} [gameSession]
 * @property {string} [token]
 * @property {string} [router]
 * @property {string} [wsServer]
 * @property {string} [connectionToken]
 * @property {string} [connectionId]
 * @property {string} [language]
 * @property {string} [currency]
 * @property {number|null} [multiplier]
 * @property {string} [country]
 * @property {string} [gender]
 * @property {string} [homeUrl]
 * @property {Record<string, string>} [extra]
 */

export class FireballSession {
  /**
   * @param {FireballSessionData} [data]
   */
  constructor(data = {}) {
    this.gameMode = data.gameMode ?? GameMode.fun
    this.environment = data.environment ?? FireballConfig.DEFAULT_ENVIRONMENT
    this.operatorId = data.operatorId ?? ''
    this.operatorPlayerSession = data.operatorPlayerSession ?? ''
    this.operatorPlayerId = data.operatorPlayerId ?? ''
    this.gameId = data.gameId ?? ''
    this.playerId = data.playerId ?? ''
    this.gameSession = data.gameSession ?? ''
    this.token = data.token ?? ''

    this.router = data.router ?? FireballConfig.URL_ROUTER_DEFAULT
    this.wsServer = data.wsServer ?? FireballConfig.URL_MESSENGER_DEFAULT
    this.connectionToken = data.connectionToken ?? ''
    this.connectionId = data.connectionId ?? ''

    this.language = data.language ?? ''
    this.currency = data.currency ?? ''
    this.multiplier = data.multiplier ?? null
    this.country = data.country ?? ''
    this.gender = data.gender ?? ''

    this.homeUrl = data.homeUrl ?? ''
    this.extra = data.extra ? { ...data.extra } : {}
  }

  toJSON() {
    return { ...this, extra: { ...this.extra } }
  }

  toJson() {
    return JSON.stringify(this.toJSON())
  }

  clone() {
    return new FireballSession(this.toJSON())
  }
}
