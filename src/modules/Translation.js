import { FireballConfig } from '../core/FireballConfig.js'
import { createLogger } from '../tools/logger.js'
import { parseTranslationResponse } from './TranslationData.js'

/**
 * Fireball Translation API client (Unity Modules.Translation equivalent).
 * GET {URL_TRANSLATION}?appId=&languageIsoCode=
 */
export class Translation {
  /**
   * @param {import('../communicator/Communicator.js').Communicator} communicator
   * @param {ReturnType<typeof createLogger>} [logger]
   */
  constructor(communicator, logger = createLogger('Translation')) {
    this._communicator = communicator
    this._logger = logger
  }

  /**
   * Fetch and parse the translation pack for an app + language.
   *
   * @param {string} gameId
   * @param {string} languageCode
   * @returns {Promise<import('./TranslationData.js').TranslationData>}
   */
  async getTranslation(gameId, languageCode) {
    const appId = String(gameId ?? '').trim()
    const languageIsoCode = String(languageCode ?? '').trim() || 'en'
    if (!appId) {
      throw new Error('Translation: gameId (appId) is required')
    }

    const json = await this._communicator.sendGET(FireballConfig.URL_TRANSLATION, {
      appId,
      languageIsoCode,
    })

    try {
      const data = parseTranslationResponse(json)
      this._logger.info(
        `On Translation: success! keys=${Object.keys(data.translation).length} lang=${languageIsoCode}`,
      )
      return data
    } catch (e) {
      const message = e?.message ?? String(e)
      this._logger.error(`On Translation: Error - can't parse json! ${message}`)
      throw e
    }
  }
}
