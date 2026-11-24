import { FireballConfig } from '../core/FireballConfig.js'
import {
  parseReplaysList,
  parseTransactionsList,
} from '../models/Transaction.js'
import { createLogger } from '../tools/logger.js'

/**
 * RGS transaction / replay history (Unity Fireball.GetTransactionsList / GetReplaysList).
 */
export class Transactions {
  /**
   * @param {import('../communicator/Communicator.js').Communicator} communicator
   * @param {() => import('../core/FireballSession.js').FireballSession|null} getSession
   * @param {() => boolean} isAuth
   * @param {ReturnType<typeof createLogger>} [logger]
   */
  constructor(
    communicator,
    getSession,
    isAuth,
    logger = createLogger('Transactions'),
  ) {
    this._communicator = communicator
    this._getSession = getSession
    this._isAuth = isAuth
    this._logger = logger
  }

  /**
   * @param {{ startIndex?: number, includeGameStates?: boolean }} [options]
   * @returns {Promise<import('../models/Transaction.js').TransactionsList>}
   */
  async getTransactionsList({
    startIndex = 0,
    includeGameStates = true,
  } = {}) {
    if (!this._isAuth()) {
      throw new Error('Transactions: Fireball is not authorized!')
    }

    const session = this._getSession()
    const connectionId = String(session?.connectionId ?? '').trim()
    if (!connectionId) {
      throw new Error('Transactions: connectionId is required')
    }

    const index = Math.max(0, Math.trunc(Number(startIndex) || 0))
    const include = includeGameStates !== false
    const url = `${FireballConfig.URL_TRANSACTIONS_HISTORY}/${connectionId}/${include}/${index}`

    const json = await this._communicator.sendGET(url)
    try {
      const result = parseTransactionsList(json)
      this._logger.info(
        `On Transactions: success! count=${result.Transactions.length}`,
      )
      return result
    } catch (e) {
      const message = e?.message ?? String(e)
      this._logger.error(`On Transactions: Error - can't parse json! ${message}`)
      throw e
    }
  }

  /**
   * @param {string} shortReplayId
   * @returns {Promise<import('../models/Transaction.js').Transaction[]>}
   */
  async getReplaysList(shortReplayId) {
    const id = String(shortReplayId ?? '').trim()
    if (!id) {
      throw new Error('Replays: shortReplayId is required')
    }

    const url = `${FireballConfig.URL_TRANSACTIONS_REPLAY}/${encodeURIComponent(id)}`
    const json = await this._communicator.sendGET(url)
    try {
      const replays = parseReplaysList(json)
      this._logger.info(`On Replays: success! count=${replays.length}`)
      return replays
    } catch (e) {
      const message = e?.message ?? String(e)
      this._logger.error(`On Replays: Error - can't parse json! ${message}`)
      throw e
    }
  }
}
