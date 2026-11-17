import { FireballConfig, GameMode } from './FireballConfig.js'
import { FireballSession } from './FireballSession.js'

/**
 * Plain settings object (Unity ScriptableObject equivalent).
 * @typedef {Object} FireballSettingsInput
 * @property {string} [gameMode]
 * @property {string} [environment]
 * @property {string} [operatorId]
 * @property {string} [gameId]
 * @property {string} [operatorPlayerId]
 * @property {string} [token]
 * @property {string} [language]
 * @property {string} [currency]
 * @property {string} [country]
 * @property {string} [gender]
 * @property {Record<string, string>|Array<{key:string,value:string}>} [extra]
 */

/**
 * @param {FireballSettingsInput} input
 * @returns {FireballSession}
 */
export function settingsToSession(input = {}) {
  const extra = normalizeExtra(input.extra)
  if (input.operatorPlayerId) {
    extra.operatorPlayerId = input.operatorPlayerId
  }

  return new FireballSession({
    gameMode: input.gameMode ?? FireballConfig.DEFAULT_GAME_MODE,
    environment: input.environment ?? FireballConfig.DEFAULT_ENVIRONMENT,
    operatorId: input.operatorId ?? '',
    gameId: input.gameId ?? '',
    operatorPlayerId: input.operatorPlayerId ?? '',
    token: input.token ?? '',
    language: input.language ?? FireballConfig.DEFAULT_LANGUAGE_CODE,
    currency: input.currency ?? FireballConfig.DEFAULT_CURRENCY,
    country: input.country ?? '',
    gender: input.gender ?? '',
    router: FireballConfig.URL_ROUTER_DEFAULT,
    wsServer: FireballConfig.URL_MESSENGER_DEFAULT,
    extra,
  })
}

/**
 * @param {Record<string, string>|Array<{key:string,value:string}>|undefined} extra
 * @returns {Record<string, string>}
 */
function normalizeExtra(extra) {
  if (!extra) return {}
  if (Array.isArray(extra)) {
    const out = {}
    for (const item of extra) {
      if (item && item.key != null) out[String(item.key)] = String(item.value ?? '')
    }
    return out
  }
  return { ...extra }
}

export { GameMode }
