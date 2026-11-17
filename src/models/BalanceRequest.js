import { BaseRequest } from './BaseRequest.js'

export const BALANCE_REQUEST_NAME = 'balance'

export class BalanceRequest extends BaseRequest {
  /**
   * @param {import('../core/FireballSession.js').FireballSession} session
   * @param {string|null} [customActionId]
   */
  constructor(session, customActionId = null) {
    super(BALANCE_REQUEST_NAME, session, customActionId)
  }
}
