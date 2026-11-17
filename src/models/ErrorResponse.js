import { BaseResponse } from './BaseResponse.js'

export const ERROR_NAME = 'error'
export const TIMEOUT_NAME = 'timeout'
export const NO_CONNECTION_REASON = 'Fail to connect to server'
export const TIMEOUT_REASON = 'Message aborted due time out {0} sec'

export class ErrorResponse extends BaseResponse {
  constructor(data = {}) {
    super(data)
    this.Code = data.Code ?? data.code ?? 0
    this.Reason = data.Reason ?? data.reason ?? ''
    this.Error = data.Error ?? data.error ?? null
    this.Balance = data.Balance ?? data.balance ?? null
  }

  get isCustomError() {
    return this.Name === ERROR_NAME
  }

  get isTimeout() {
    return this.Name === TIMEOUT_NAME
  }

  get hasDialog() {
    return Boolean(this.Error?.Dialog ?? this.Error?.dialog)
  }

  toJSON() {
    return {
      ...super.toJSON(),
      Code: this.Code,
      Reason: this.Reason,
      Error: this.Error,
      Balance: this.Balance,
    }
  }

  static customError(actionId, reason, code = 0) {
    return new ErrorResponse({
      ActionId: actionId,
      Name: ERROR_NAME,
      Reason: reason,
      Code: code,
    })
  }

  static timeoutResponse(actionId, timeout, code = 0) {
    return new ErrorResponse({
      ActionId: actionId,
      Name: TIMEOUT_NAME,
      Reason: TIMEOUT_REASON.replace('{0}', String(timeout)),
      Code: code,
    })
  }
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {boolean}
 */
export function isErrorPayload(raw) {
  if (!raw || typeof raw !== 'object') return false
  const reason = raw.Reason ?? raw.reason
  return typeof reason === 'string' && reason.length > 0
}

export function parseErrorResponse(raw) {
  return new ErrorResponse(raw ?? {})
}
