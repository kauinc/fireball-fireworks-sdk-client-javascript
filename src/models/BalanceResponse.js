import { BaseResponse } from './BaseResponse.js'

export const BALANCE_RESPONSE_NAME = 'balance-updated'

export class BalanceResponse extends BaseResponse {
  constructor(data = {}) {
    super({ ...data, Name: data.Name ?? data.name ?? BALANCE_RESPONSE_NAME })
    this.Balance = data.Balance ?? data.balance ?? 0
  }

  toJSON() {
    return {
      ...super.toJSON(),
      Balance: this.Balance,
    }
  }
}

export function parseBalanceResponse(raw) {
  return new BalanceResponse(raw ?? {})
}
