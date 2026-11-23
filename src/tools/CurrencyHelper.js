/**
 * Currency formatting (mirrors Unity Fireball.Tools.CurrencyHelper).
 * Call {@link setSession} after auth so fiat/crypto multipliers apply.
 */

/** @typedef {{ Code: string, SymbolFormat: string, Decimals: number, DecimalsMultiplier: number, BetMultiplier: number, Desc?: string }} CurrencyData */

/**
 * @param {string} code
 * @param {string} symbolFormat
 * @param {number} [decimals]
 * @param {number} [multiplier]
 * @param {number} [betMultiplier]
 * @param {string} [desc]
 * @returns {CurrencyData}
 */
function currencyData(
  code,
  symbolFormat,
  decimals = 2,
  multiplier = 0.01,
  betMultiplier = 1,
  desc = undefined,
) {
  return {
    Code: code,
    SymbolFormat: symbolFormat,
    Decimals: decimals,
    DecimalsMultiplier: multiplier,
    BetMultiplier: betMultiplier,
    Desc: desc,
  }
}

/** @type {import('../core/FireballSession.js').FireballSession | null} */
let _session = null

/** @type {string[]} */
let _fiatCodes = []

const VIRTUAL = Object.freeze({
  GHC: currencyData('GHC', 'SC {0}', 2, 0.01, 1, 'Markor Sweepstakes Coin'),
  WOC: currencyData('WOC', 'SC {0}', 2, 0.01, 1, 'Markor WOC Sweepstakes Coin'),
  SSC: currencyData('SSC', 'SC {0}', 2, 0.01, 1, 'Markor Sweepstakes Coin'),
  SS1: currencyData('SS1', 'SC {0}', 2, 0.01, 1, 'Hub88 Sweepstakes Coin'),
  'SC.': currencyData('SC.', 'SC {0}', 2, 0.01, 1, 'Sweepstakes Coin via Relax P2P'),
  XSC: currencyData('XSC', 'SC {0}', 2, 0.01, 1, 'Generic Sweepstakes Coin'),
  GCC: currencyData('GCC', 'GC {0}', 2, 0.01, 1, 'Markor Gold Coin'),
  XGC: currencyData('XGC', 'GC {0}', 2, 0.01, 1, 'Generic Gold Coin'),
  'GC.': currencyData('GC.', 'GC {0}', 2, 0.01, 1, 'Gold Coin via Relax P2P'),
  GLD: currencyData('GLD', 'GC {0}', 2, 0.01, 1, 'Hub88 Gold Coin'),
  SFC: currencyData('SFC', 'FC {0}', 2, 0.01, 1, 'Markor Sweepstakes Coin (Casimba)'),
  FCC: currencyData('FCC', 'FC {0}', 2, 0.01, 1, '(Fortune) Sweepstakes Coin'),
  'FC.': currencyData('FC.', 'FC {0}', 2, 0.01, 1, 'Relax Fortune Coin'),
  'BT.': currencyData('BT.', 'BT {0}', 2, 0.01, 1, 'Relax Bit'),
  'BK.': currencyData('BK.', 'BK {0}', 2, 0.01, 1, 'Relax Buck'),
  VBC: currencyData('VBC', 'WOW {0}', 2, 0.01, 1, 'Markor VBC Fun Coin'),
})

const CRYPTO = Object.freeze({
  BTC: currencyData('BTC', 'BTC {0}', 8, 0.00000001, 10, 'Bitcoin'),
  MBTC: currencyData('MBTC', 'mBTC {0}', 5, 0.00001, 10, 'Milli Bitcoin'),
  UBTC: currencyData('UBTC', 'uBTC {0}', 5, 0.01, 10, 'Micro Bitcoin'),
  ETH: currencyData('ETH', 'ETH {0}', 8, 1e-12, 1_000_000, 'Ethereum'),
  METH: currencyData('METH', 'mETH {0}', 8, 1e-15, 1_000_000_000_000, 'Milli Ethereum'),
  UETH: currencyData('UETH', 'uETH {0}', 8, 1e-12, 1_000_000_000_000, 'Micro Ethereum'),
  USDT: currencyData('USDT', 'USDT {0}', 8, 0.01, 1, 'Tether'),
  ADA: currencyData('ADA', 'ADA {0}', 8, 0.000001, 10000, 'Cardano'),
  BNB: currencyData('BNB', 'BNB {0}', 8, 1e-12, 10_000_000, 'Binance Coin'),
  XRP: currencyData('XRP', 'XRP {0}', 8, 0.000001, 1000, 'Ripple'),
  LTC: currencyData('LTC', 'LTC {0}', 8, 0.00000001, 10000, 'Litecoin'),
  MLTC: currencyData('MLTC', 'mLTC {0}', 8, 0.00001, 10000, 'Milli Litecoin'),
  ULTC: currencyData('ULTC', 'uLTC {0}', 8, 0.01, 10000, 'Micro Litecoin'),
})

const COIN_CURRENCY_CODES = Object.freeze(new Set(['COINS', 'COIN']))

/**
 * @param {import('../core/FireballSession.js').FireballSession | null | undefined} session
 */
export function setSession(session) {
  _session = session ?? null
}

export function getSession() {
  return _session
}

/**
 * @param {string | null | undefined} currencyCode
 */
export function isCoinCurrency(currencyCode) {
  if (!currencyCode) return false
  return COIN_CURRENCY_CODES.has(String(currencyCode).toUpperCase())
}

/**
 * @param {string | null | undefined} currencyCode
 */
export function isVirtualCurrency(currencyCode) {
  if (!currencyCode) return false
  return Object.prototype.hasOwnProperty.call(
    VIRTUAL,
    String(currencyCode).toUpperCase(),
  )
}

/**
 * @param {string | null | undefined} currencyCode
 */
export function isCryptoCurrency(currencyCode) {
  if (!currencyCode) return false
  return Object.prototype.hasOwnProperty.call(
    CRYPTO,
    String(currencyCode).toUpperCase(),
  )
}

/**
 * @param {string | null | undefined} currencyCode
 */
export function isFiatCurrency(currencyCode) {
  if (!currencyCode) return false
  const code = String(currencyCode).toUpperCase()
  if (isCoinCurrency(code) || isVirtualCurrency(code) || isCryptoCurrency(code)) {
    return false
  }
  return getFiatCurrencies().includes(code)
}

/**
 * @param {string | null | undefined} currencyCode
 */
export function getDefaultBetMultiplier(currencyCode) {
  if (!currencyCode) return 1
  const key = String(currencyCode).toUpperCase()
  if (VIRTUAL[key]) return VIRTUAL[key].BetMultiplier
  if (CRYPTO[key]) return CRYPTO[key].BetMultiplier
  return 1
}

/**
 * @param {number|bigint|string} money minor units (cents / coin units)
 * @param {string | null} [customCurrency]
 * @param {string | null} [locale]
 */
export function formatMoney(money, customCurrency = null, locale = null) {
  const amount = Number(money)
  if (!Number.isFinite(amount)) return '0'

  const session = _session
  const currency = (customCurrency ?? session?.currency ?? 'USD').toUpperCase()
  const loc = locale ?? localeFromSession(session, currency)

  if (isCoinCurrency(currency) || session?.gameMode === 'coins') {
    return Math.round(amount).toLocaleString(loc, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })
  }

  const mult = decimalsMultiplier(session)

  if (isFiatCurrency(currency)) {
    try {
      // Unity: (major).ToString("C2", cultureFromCurrency).
      // narrowSymbol ≈ .NET RegionInfo.CurrencySymbol (₴), not the
      // wordy CLDR "standard" symbol some browsers use for `symbol` (грн).
      return new Intl.NumberFormat(loc, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount * mult)
    } catch {
      return `${currency} ${(amount * mult).toFixed(2)}`
    }
  }

  if (VIRTUAL[currency]) {
    const data = VIRTUAL[currency]
    const n = (amount * (session?.multiplier != null ? 1 / session.multiplier : data.DecimalsMultiplier)).toLocaleString(
      loc,
      {
        minimumFractionDigits: data.Decimals,
        maximumFractionDigits: data.Decimals,
      },
    )
    return data.SymbolFormat.replace('{0}', n)
  }

  if (CRYPTO[currency]) {
    const data = CRYPTO[currency]
    const cryptoMult =
      session?.multiplier != null ? 1 / session.multiplier : data.DecimalsMultiplier
    const n = trimCrypto((amount * cryptoMult).toFixed(16))
    return data.SymbolFormat.replace('{0}', n)
  }

  return `${currency} ${trimCrypto((amount * mult).toFixed(16))}`
}

/**
 * Numbers only (no currency symbol).
 * @param {number|bigint|string} money
 * @param {string | null} [customCurrency]
 * @param {string | null} [locale]
 */
export function formatMoneyNumbersOnly(money, customCurrency = null, locale = null) {
  const amount = Number(money)
  if (!Number.isFinite(amount)) return '0'

  const session = _session
  const currency = (customCurrency ?? session?.currency ?? 'USD').toUpperCase()
  const loc = locale ?? localeFromSession(session, currency)

  if (isCoinCurrency(currency) || session?.gameMode === 'coins') {
    return Math.round(amount).toLocaleString(loc, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })
  }

  const mult = decimalsMultiplier(session)
  const decimals =
    session?.multiplier != null ? calculateDecimals(session.multiplier) : 2

  if (isFiatCurrency(currency)) {
    return (amount * mult).toLocaleString(loc, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  if (VIRTUAL[currency]) {
    const data = VIRTUAL[currency]
    const vMult =
      session?.multiplier != null ? 1 / session.multiplier : data.DecimalsMultiplier
    return (amount * vMult).toLocaleString(loc, {
      minimumFractionDigits: data.Decimals,
      maximumFractionDigits: data.Decimals,
    })
  }

  if (CRYPTO[currency]) {
    const data = CRYPTO[currency]
    const cryptoMult =
      session?.multiplier != null ? 1 / session.multiplier : data.DecimalsMultiplier
    return trimCrypto((amount * cryptoMult).toFixed(16))
  }

  return trimCrypto((amount * mult).toFixed(16))
}

export const CurrencyHelper = Object.freeze({
  setSession,
  getSession,
  isCoinCurrency,
  isVirtualCurrency,
  isCryptoCurrency,
  isFiatCurrency,
  getDefaultBetMultiplier,
  formatMoney,
  formatMoneyNumbersOnly,
})

/**
 * @param {import('../core/FireballSession.js').FireballSession | null | undefined} session
 */
function decimalsMultiplier(session) {
  if (session?.multiplier != null && Number(session.multiplier) > 0) {
    return 1 / Number(session.multiplier)
  }
  return 0.01
}

/**
 * @param {number} multiplier
 */
function calculateDecimals(multiplier) {
  let decimals = 0
  let m = Number(multiplier)
  while (m >= 10) {
    decimals += 1
    m = Math.floor(m / 10)
  }
  return decimals
}

/**
 * @param {string} fixed
 */
function trimCrypto(fixed) {
  return fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
}

/**
 * Primary locale for a fiat ISO (mirrors Unity CultureFromCurrency → first/matching region).
 * Language is intentionally ignored — same as GOO Ares CurrencyHelper.GetCulture.
 */
const CURRENCY_LOCALES = Object.freeze({
  USD: ['en-US'],
  EUR: ['de-DE', 'fr-FR', 'nl-NL', 'it-IT', 'es-ES', 'pt-PT', 'fi-FI', 'sk-SK', 'sl-SI', 'lv-LV', 'lt-LT', 'et-EE', 'mt-MT', 'ga-IE', 'el-GR'],
  GBP: ['en-GB'],
  JPY: ['ja-JP'],
  AUD: ['en-AU'],
  CAD: ['en-CA', 'fr-CA'],
  CHF: ['de-CH', 'fr-CH', 'it-CH'],
  CNY: ['zh-CN'],
  SEK: ['sv-SE'],
  NZD: ['en-NZ'],
  MXN: ['es-MX'],
  SGD: ['en-SG'],
  HKD: ['zh-HK', 'en-HK'],
  NOK: ['nb-NO'],
  KRW: ['ko-KR'],
  TRY: ['tr-TR'],
  INR: ['en-IN', 'hi-IN'],
  RUB: ['ru-RU'],
  BRL: ['pt-BR'],
  ZAR: ['en-ZA'],
  DKK: ['da-DK'],
  PLN: ['pl-PL'],
  TWD: ['zh-TW'],
  THB: ['th-TH'],
  IDR: ['id-ID'],
  HUF: ['hu-HU'],
  CZK: ['cs-CZ'],
  ILS: ['he-IL'],
  CLP: ['es-CL'],
  PHP: ['en-PH', 'fil-PH'],
  AED: ['ar-AE'],
  COP: ['es-CO'],
  SAR: ['ar-SA'],
  MYR: ['ms-MY'],
  RON: ['ro-RO'],
  BGN: ['bg-BG'],
  UAH: ['uk-UA'],
  ARS: ['es-AR'],
  VND: ['vi-VN'],
  PKR: ['ur-PK', 'en-PK'],
})

/** Country → default culture name ending (Unity CultureFromCountry). */
const COUNTRY_LOCALES = Object.freeze({
  US: 'en-US',
  GB: 'en-GB',
  AU: 'en-AU',
  CA: 'en-CA',
  NZ: 'en-NZ',
  IE: 'en-IE',
  DE: 'de-DE',
  FR: 'fr-FR',
  ES: 'es-ES',
  IT: 'it-IT',
  PT: 'pt-PT',
  BR: 'pt-BR',
  NL: 'nl-NL',
  SE: 'sv-SE',
  NO: 'nb-NO',
  DK: 'da-DK',
  FI: 'fi-FI',
  PL: 'pl-PL',
  CZ: 'cs-CZ',
  HU: 'hu-HU',
  RO: 'ro-RO',
  BG: 'bg-BG',
  UA: 'uk-UA',
  RU: 'ru-RU',
  TR: 'tr-TR',
  JP: 'ja-JP',
  KR: 'ko-KR',
  CN: 'zh-CN',
  TW: 'zh-TW',
  HK: 'zh-HK',
  IN: 'en-IN',
  SG: 'en-SG',
  MY: 'ms-MY',
  TH: 'th-TH',
  ID: 'id-ID',
  PH: 'en-PH',
  VN: 'vi-VN',
  MX: 'es-MX',
  AR: 'es-AR',
  CL: 'es-CL',
  CO: 'es-CO',
  ZA: 'en-ZA',
  AE: 'ar-AE',
  SA: 'ar-SA',
  IL: 'he-IL',
  CH: 'de-CH',
})

/**
 * Unity-equivalent culture selection:
 * - fiat → locale from currency (prefer session.country when it matches that currency)
 * - coins / virtual / crypto → locale from country only
 * Session language is NOT used (matches GOO Ares).
 *
 * @param {import('../core/FireballSession.js').FireballSession | null | undefined} session
 * @param {string | null | undefined} [currencyOverride]
 */
function localeFromSession(session, currencyOverride = null) {
  const currency = String(
    currencyOverride ?? session?.currency ?? 'USD',
  ).toUpperCase()
  const country = String(session?.country ?? '')
    .trim()
    .toUpperCase()

  if (isFiatCurrency(currency)) {
    return cultureFromCurrency(currency, country)
  }
  return cultureFromCountry(country) || 'en-US'
}

/**
 * @param {string} currencyISO
 * @param {string} [countryISO]
 */
function cultureFromCurrency(currencyISO, countryISO = '') {
  const locales = CURRENCY_LOCALES[currencyISO]
  if (!locales?.length) {
    return cultureFromCountry(countryISO) || 'en-US'
  }
  if (countryISO) {
    const match = locales.find((loc) =>
      loc.toUpperCase().endsWith(`-${countryISO}`),
    )
    if (match) return match
  }
  return locales[0]
}

/**
 * @param {string} countryISO
 */
function cultureFromCountry(countryISO) {
  if (!countryISO || countryISO.length !== 2) return null
  return COUNTRY_LOCALES[countryISO] || `en-${countryISO}`
}

function getFiatCurrencies() {
  if (_fiatCodes.length > 0) return _fiatCodes
  _fiatCodes = Object.keys(CURRENCY_LOCALES)
  return _fiatCodes
}
