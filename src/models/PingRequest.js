import { BaseRequest } from './BaseRequest.js'

export const PING_REQUEST_NAME = 'ping'

export class PingRequest extends BaseRequest {
  /**
   * @param {import('../core/FireballSession.js').FireballSession} session
   */
  constructor(session) {
    super(PING_REQUEST_NAME, session)
  }
}
