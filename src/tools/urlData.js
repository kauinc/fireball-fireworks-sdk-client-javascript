import {
  Environments,
  FireballConfig,
  GameMode,
} from '../core/FireballConfig.js'
import { FireballSession } from '../core/FireballSession.js'
import { createLogger } from './logger.js'

export const URL_PARAMS = Object.freeze({
  OPERATOR_ID: 'operatorId',
  GAME_ID: 'gameId',
  PLAYER_ID: 'playerId',
  ENVIRONMENT: 'environment',
  LANGUAGE: 'language',
  CURRENCY: 'currency',
  COUNTRY: 'country',
  GENDER: 'gender',
  TOKEN: 'token',
  MODE: 'mode',
  WS_SERVER: 'messages',
  ROUTER_URL: 'router',
  HOME_URL: 'home',
  EXTRA: 'extra',
  REPLAY: 'replay',
})

/**
 * @param {string} [customUrl]
 * @returns {FireballSession}
 */
export function parseSessionFromUrl(customUrl) {
  const logger = createLogger('URL')
  const params = customUrl
    ? parseUrlParams(customUrl)
    : getSearchParameters()

  const session = new FireballSession()
  const extra = {}

  for (const [param, value] of Object.entries(params)) {
    if (param === URL_PARAMS.OPERATOR_ID) session.operatorId = value
    else if (param === URL_PARAMS.GAME_ID) session.gameId = value
    else if (param === URL_PARAMS.ENVIRONMENT) session.environment = value
    else if (param === URL_PARAMS.LANGUAGE) session.language = value
    else if (param === URL_PARAMS.CURRENCY) session.currency = value
    else if (param === URL_PARAMS.COUNTRY) session.country = value
    else if (param === URL_PARAMS.GENDER) session.gender = value
    else if (param === URL_PARAMS.TOKEN) session.token = value
    else if (param === URL_PARAMS.WS_SERVER) session.wsServer = safeDecode(value)
    else if (param === URL_PARAMS.MODE) session.gameMode = value
    else if (param === URL_PARAMS.ROUTER_URL) session.router = safeDecode(value)
    else if (param === URL_PARAMS.HOME_URL) session.homeUrl = safeDecode(value)
    else extra[param] = value
  }

  validateSession(session, logger)
  extra[URL_PARAMS.CURRENCY] = session.currency
  session.extra = extra
  return session
}

/**
 * @param {string} url
 * @returns {Record<string, string>}
 */
export function parseUrlParams(url) {
  try {
    const parsed = new URL(url, 'http://localhost')
    const out = {}
    for (const [k, v] of parsed.searchParams.entries()) {
      out[k] = v
    }
    return out
  } catch {
    const qIndex = url.indexOf('?')
    if (qIndex < 0) return {}
    const search = url.slice(qIndex + 1)
    const out = {}
    for (const part of search.split('&')) {
      if (!part) continue
      const [rawKey, ...rest] = part.split('=')
      const key = decodeURIComponent(rawKey)
      const value = decodeURIComponent(rest.join('=') || '')
      out[key] = value
    }
    return out
  }
}

function getSearchParameters() {
  if (typeof window !== 'undefined' && window.location?.search) {
    const out = {}
    const sp = new URLSearchParams(window.location.search)
    for (const [k, v] of sp.entries()) out[k] = v
    return out
  }
  return {}
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * @param {FireballSession} session
 * @param {{ warning: Function }} logger
 */
function validateSession(session, logger) {
  if (!session.operatorId) logger.warning('Url params do not contain - operatorId!')
  if (!session.gameId) logger.warning('Url params do not contain - gameId!')
  if (!session.token) logger.warning('Url params do not contain - token!')
  if (!session.wsServer) logger.warning('Url params do not contain - messages!')

  if (!session.language) {
    logger.warning('Url params do not contain - language!')
    session.language = FireballConfig.DEFAULT_LANGUAGE_CODE
  }
  if (!session.country) logger.warning('Url params do not contain - country!')
  if (!session.gender) logger.warning('Url params do not contain - gender!')

  if (!session.environment) {
    logger.warning('Url params do not contain - Environments!')
    session.environment = FireballConfig.DEFAULT_ENVIRONMENT
  } else if (!Object.values(Environments).includes(session.environment.toLowerCase())) {
    logger.warning(`Can't parse - Environments! Environments String = ${session.environment}`)
    session.environment = FireballConfig.DEFAULT_ENVIRONMENT
  } else {
    session.environment = session.environment.toLowerCase()
  }

  if (!session.gameMode) {
    logger.warning('Url params do not contain - mode!')
    session.gameMode = FireballConfig.DEFAULT_GAME_MODE
  } else {
    const mode = session.gameMode.toLowerCase()
    if (!Object.values(GameMode).includes(mode)) {
      logger.warning(`Can't parse - mode! Mode String = ${session.gameMode}`)
      session.gameMode = FireballConfig.DEFAULT_GAME_MODE
    } else {
      session.gameMode = mode
    }
  }

  if (!session.currency) {
    logger.warning('Url params do not contain - currency!')
    session.currency =
      session.gameMode === GameMode.coins
        ? FireballConfig.DEFAULT_COINS_CURRENCY
        : FireballConfig.DEFAULT_CURRENCY
  }
}
