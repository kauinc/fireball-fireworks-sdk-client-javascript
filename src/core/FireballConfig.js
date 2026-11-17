/** Default endpoints and constants (mirrors Unity FireballConfig). */
export const FireballConfig = Object.freeze({
  URL_FIREBALL_SERVER: 'https://cloud.fireballserver.com',
  URL_FIREBALL_SERVER_API: 'https://api.fireballserver.com/api/v2.0',
  URL_ROUTER_DEFAULT: 'https://cloud.fireballserver.com/router',
  URL_MESSENGER_DEFAULT: 'https://cloud.fireballserver.com/messages/messages',
  URL_TRANSACTIONS_HISTORY:
    'https://cloud.fireballserver.com/sessions/replay/transactions',
  URL_TRANSACTIONS_REPLAY: 'https://cloud.fireballserver.com/sessions/replay',
  URL_BET_TIERS: 'https://api.fireballserver.com/api/v2.0/bet-tiers',
  URL_TRANSLATION: 'https://cloud.fireballserver.com/translations/v1/translate',
  URL_GCI_SCRIPTS: 'https://cloud.fireballserver.com/launcher/game-scripts/',

  DEFAULT_LANGUAGE_CODE: 'en',
  DEFAULT_COUNTRY_CODE: 'US',
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_COINS_CURRENCY: 'COINS',
  DEFAULT_TIMEOUT: 30,
  DEFAULT_ENVIRONMENT: 'development',
  DEFAULT_GAME_MODE: 'fun',

  DEMO_BALANCE: 100000,
  DEMO_USER_ID: 'demo-player',
  DEMO_SESSION: 'demo-session',
})

export const Environments = Object.freeze({
  development: 'development',
  staging: 'staging',
  production: 'production',
})

export const GameMode = Object.freeze({
  fun: 'fun',
  money: 'money',
  coins: 'coins',
})

export const LogLevels = Object.freeze({
  None: 0,
  Error: 1,
  Warning: 2,
  Information: 3,
  Debug: 4,
})
