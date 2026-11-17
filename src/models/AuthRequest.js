import { BaseRequest } from './BaseRequest.js'

export const AUTH_REQUEST_NAME = 'authenticate'

export class AuthRequest extends BaseRequest {
  /**
   * @param {import('../core/FireballSession.js').FireballSession} session
   * @param {string|null} [customActionId]
   */
  constructor(session, customActionId = null) {
    super(AUTH_REQUEST_NAME, session, customActionId)
    this.Token = session?.token ?? ''
  }

  toJSON() {
    return {
      ...super.toJSON(),
      Token: this.Token,
    }
  }
}
