import { createLogger } from '../tools/logger.js'
import { formatUrlAndParams, getNextDeviceSequence } from '../tools/ids.js'

export class Communicator {
  constructor() {
    this._logger = createLogger('HTTP')
  }

  /**
   * @param {string} url
   * @param {Record<string, string>|null} [query]
   * @returns {Promise<string>}
   */
  async sendGET(url, query = null) {
    const fullUrl = formatUrlAndParams(url, query ?? undefined)
    this._logger.info(`Sending GET Request to URL = ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })

    const text = await response.text()
    if (!response.ok) {
      this._logger.error(`GET Request Error: ${text} (${response.status})`)
      throw new Error(text || `GET failed (${response.status})`)
    }

    this._logger.info(`GET Response: ${text} (${response.status})`)
    return text
  }

  /**
   * @param {string} url
   * @param {import('../models/BaseMessage.js').BaseMessage|Record<string, unknown>} request
   * @returns {Promise<string>}
   */
  async sendPOST(url, request) {
    if (request && typeof request === 'object') {
      request.MessageClientDeviceSequence = getNextDeviceSequence()
    }

    const body =
      typeof request?.toJson === 'function'
        ? request.toJson()
        : JSON.stringify(
            typeof request?.toJSON === 'function' ? request.toJSON() : request,
          )

    const name = request?.Name ?? request?.name ?? 'unknown'
    const actionId = request?.ActionId ?? request?.actionId ?? ''
    const messageId = request?.MessageId ?? request?.messageId ?? ''
    const seq = request?.MessageClientDeviceSequence ?? 0
    const gameSession = request?.GameSession ?? request?.gameSession ?? ''

    this._logger.info(
      `Message - ${name} - Sending... (ActionId: ${actionId}, MessageId: ${messageId}, MessageClientDeviceSequence: ${seq}, GameSession: ${gameSession})\nMessage: ${body}`,
    )

    let response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      })
    } catch (e) {
      const reason = e?.message ?? String(e)
      this._logger.error(
        `Message - ${name} - Error: ${reason} (ActionId: ${actionId}, GameSession: ${gameSession})`,
      )
      const err = new Error(reason)
      err.isNetworkError = true
      throw err
    }

    const text = await response.text()
    if (!response.ok) {
      this._logger.error(
        `Message - ${name} - Error: ${text} (${response.status}) (ActionId: ${actionId}, GameSession: ${gameSession})`,
      )
      const err = new Error(text || `POST failed (${response.status})`)
      err.isNetworkError = response.status === 0 || response.status >= 500
      err.status = response.status
      throw err
    }

    this._logger.info(
      `Message - ${name} - Sent (ActionId: ${actionId}, GameSession: ${gameSession})`,
    )
    return text
  }
}
