/**
 * Transaction / replay models (Unity Fireball.Game.Client.Models.Transaction).
 * API payloads use camelCase; parsers accept PascalCase too.
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function asString(value) {
  if (value == null) return ''
  return String(value)
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function asLong(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

/**
 * @param {unknown} value
 * @returns {Date|null}
 */
function asDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * @param {unknown} raw
 * @returns {Replay}
 */
export function parseReplay(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return new Replay({
    Id: src.Id ?? src.id,
    GameState: src.GameState ?? src.gameState,
    Timestamp: src.Timestamp ?? src.timestamp,
  })
}

/**
 * @param {unknown} raw
 * @returns {Transaction}
 */
export function parseTransaction(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const gameStatesRaw = src.GameStates ?? src.gameStates
  const gameStates = Array.isArray(gameStatesRaw)
    ? gameStatesRaw.map(parseReplay)
    : []
  return new Transaction({
    ReplayId: src.ReplayId ?? src.replayId,
    Start: src.Start ?? src.start,
    End: src.End ?? src.end,
    Currency: src.Currency ?? src.currency,
    Bet: src.Bet ?? src.bet,
    Win: src.Win ?? src.win,
    Jackpot: src.Jackpot ?? src.jackpot,
    GameStates: gameStates,
    Pending: src.Pending ?? src.pending,
  })
}

/**
 * @param {string|object} json
 * @returns {TransactionsList}
 */
export function parseTransactionsList(json) {
  const payload = typeof json === 'string' ? safeParseJson(json) : json
  if (!payload || typeof payload !== 'object') {
    throw new Error('Transactions: parse error — expected object')
  }
  const listRaw = payload.Transactions ?? payload.transactions
  const transactions = Array.isArray(listRaw)
    ? listRaw.map(parseTransaction)
    : []
  return new TransactionsList({ Transactions: transactions })
}

/**
 * Unity GetReplaysList deserializes ReplayList and returns `.Replays` (List&lt;Transaction&gt;).
 * @param {string|object} json
 * @returns {Transaction[]}
 */
export function parseReplaysList(json) {
  const payload = typeof json === 'string' ? safeParseJson(json) : json
  if (!payload || typeof payload !== 'object') {
    throw new Error('Replays: parse error — expected object')
  }
  const listRaw = payload.Replays ?? payload.replays
  if (!Array.isArray(listRaw)) return []
  return listRaw.map(parseTransaction)
}

/**
 * @param {string} json
 * @returns {object}
 */
function safeParseJson(json) {
  try {
    return JSON.parse(json)
  } catch (e) {
    throw new Error(`Transactions: parse error — ${e?.message ?? e}`)
  }
}

export class Replay {
  /**
   * @param {{ Id?: unknown, GameState?: unknown, Timestamp?: unknown }} [data]
   */
  constructor(data = {}) {
    this.Id = asString(data.Id)
    this.GameState = asString(data.GameState)
    this.Timestamp = asDate(data.Timestamp)
  }

  /**
   * Parse GameState JSON string into an object (or typed shape via caller).
   * @returns {object|null}
   */
  parseGameState() {
    if (!this.GameState) return null
    try {
      const parsed = JSON.parse(this.GameState)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }
}

export class Transaction {
  /**
   * @param {{
   *   ReplayId?: unknown,
   *   Start?: unknown,
   *   End?: unknown,
   *   Currency?: unknown,
   *   Bet?: unknown,
   *   Win?: unknown,
   *   Jackpot?: unknown,
   *   GameStates?: Replay[],
   *   Pending?: unknown,
   * }} [data]
   */
  constructor(data = {}) {
    this.ReplayId = asString(data.ReplayId)
    this.Start = asDate(data.Start)
    this.End = asDate(data.End)
    this.Currency = asString(data.Currency)
    this.Bet = asLong(data.Bet)
    this.Win = asLong(data.Win)
    this.Jackpot = asLong(data.Jackpot)
    this.GameStates = Array.isArray(data.GameStates) ? data.GameStates : []
    this.Pending = Boolean(data.Pending)
  }

  toJson() {
    return JSON.stringify(this)
  }
}

export class TransactionsList {
  /**
   * @param {{ Transactions?: Transaction[] }} [data]
   */
  constructor(data = {}) {
    this.Transactions = Array.isArray(data.Transactions) ? data.Transactions : []
  }
}

export class ReplayList {
  /**
   * @param {{ Replays?: Transaction[] }} [data]
   */
  constructor(data = {}) {
    this.Replays = Array.isArray(data.Replays) ? data.Replays : []
  }
}
