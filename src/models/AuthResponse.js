import { BaseResponse } from './BaseResponse.js'

export const AUTH_RESPONSE_NAME = 'session'

export class AuthResponse extends BaseResponse {
  constructor(data = {}) {
    super({ ...data, Name: data.Name ?? data.name ?? AUTH_RESPONSE_NAME })
    this.Balance = data.Balance ?? data.balance ?? 0
    this.Multiplier = data.Multiplier ?? data.multiplier ?? null
    this.GameState = data.GameState ?? data.gameState ?? null
    this.Jackpots = data.Jackpots ?? data.jackpots ?? null
    this.FreeBetCampaigns = data.FreeBetCampaigns ?? data.freeBetCampaigns ?? null
  }

  toJSON() {
    return {
      ...super.toJSON(),
      Balance: this.Balance,
      Multiplier: this.Multiplier,
      GameState: this.GameState,
      Jackpots: this.Jackpots,
      FreeBetCampaigns: this.FreeBetCampaigns,
    }
  }
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {AuthResponse}
 */
export function parseAuthResponse(raw) {
  return new AuthResponse(raw ?? {})
}
