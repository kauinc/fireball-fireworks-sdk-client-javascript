import { BaseMessage } from './BaseMessage.js'
import {
  generateActionId,
  getNowTimestampMilliSeconds,
} from '../tools/ids.js'

/**
 * Build a request envelope from a FireballSession (Unity BaseRequest).
 * @param {string} name
 * @param {import('../core/FireballSession.js').FireballSession|null} session
 * @param {string|null} [customActionId]
 * @param {Record<string, unknown>} [fields]
 * @returns {BaseMessage & Record<string, unknown>}
 */
export function createRequest(name, session, customActionId = null, fields = {}) {
  const request = new BaseMessage({
    Name: name,
    ActionId: customActionId || generateActionId(),
    MessageId: generateActionId(),
    MessageTimestamp: getNowTimestampMilliSeconds(),
  })

  if (session) {
    request.Environment = session.environment
    request.OperatorId = session.operatorId
    request.OperatorPlayerId = session.operatorPlayerId
    request.OperatorPlayerSession = session.operatorPlayerSession
    request.GameId = session.gameId
    request.PlayerId = session.playerId
    request.GameSession = session.gameSession
    request.GameMode = session.gameMode
    request.Currency = session.currency
    request.ConnectionId = session.connectionId
    request.Extra = session.extra ? { ...session.extra } : null
  }

  return Object.assign(request, fields)
}

export class BaseRequest extends BaseMessage {
  /**
   * @param {string} name
   * @param {import('../core/FireballSession.js').FireballSession|null} session
   * @param {string|null} [customActionId]
   */
  constructor(name, session, customActionId = null) {
    const built = createRequest(name, session, customActionId)
    super(built)
    Object.assign(this, built)
  }
}
