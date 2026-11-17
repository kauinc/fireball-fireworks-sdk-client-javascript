export class BaseMessage {
  constructor(data = {}) {
    this.Name = data.Name ?? data.name ?? ''
    this.ActionId = data.ActionId ?? data.actionId ?? ''
    this.MessageId = data.MessageId ?? data.messageId ?? ''
    this.MessageClientDeviceSequence =
      data.MessageClientDeviceSequence ?? data.messageClientDeviceSequence ?? 0
    this.MessageServerDeviceSequence =
      data.MessageServerDeviceSequence ?? data.messageServerDeviceSequence ?? 0
    this.Environment = data.Environment ?? data.environment ?? ''
    this.OperatorId = data.OperatorId ?? data.operatorId ?? ''
    this.OperatorPlayerSession =
      data.OperatorPlayerSession ?? data.operatorPlayerSession ?? ''
    this.OperatorPlayerId = data.OperatorPlayerId ?? data.operatorPlayerId ?? ''
    this.GameId = data.GameId ?? data.gameId ?? ''
    this.PlayerId = data.PlayerId ?? data.playerId ?? ''
    this.GameSession = data.GameSession ?? data.gameSession ?? ''
    this.GameMode = data.GameMode ?? data.gameMode ?? ''
    this.Currency = data.Currency ?? data.currency ?? ''
    this.ConnectionId = data.ConnectionId ?? data.connectionId ?? ''
    this.MessageTimestamp = data.MessageTimestamp ?? data.messageTimestamp ?? 0
    this.Extra = data.Extra ?? data.extra ?? null
  }

  /** Copy envelope fields from another message (server-side pattern). */
  copyBaseParams(source) {
    if (!source) return this
    this.ActionId = source.ActionId ?? source.actionId ?? this.ActionId
    this.MessageId = source.MessageId ?? source.messageId ?? this.MessageId
    this.Environment = source.Environment ?? source.environment ?? this.Environment
    this.OperatorId = source.OperatorId ?? source.operatorId ?? this.OperatorId
    this.OperatorPlayerSession =
      source.OperatorPlayerSession ??
      source.operatorPlayerSession ??
      this.OperatorPlayerSession
    this.OperatorPlayerId =
      source.OperatorPlayerId ?? source.operatorPlayerId ?? this.OperatorPlayerId
    this.GameId = source.GameId ?? source.gameId ?? this.GameId
    this.PlayerId = source.PlayerId ?? source.playerId ?? this.PlayerId
    this.GameSession = source.GameSession ?? source.gameSession ?? this.GameSession
    this.GameMode = source.GameMode ?? source.gameMode ?? this.GameMode
    this.Currency = source.Currency ?? source.currency ?? this.Currency
    this.ConnectionId = source.ConnectionId ?? source.connectionId ?? this.ConnectionId
    this.Extra = source.Extra ?? source.extra ?? this.Extra
    return this
  }

  /**
   * Serialize all enumerable own fields (Unity JsonConvert.SerializeObject parity)
   * so game-specific request properties are included.
   */
  toJSON() {
    const out = {}
    for (const key of Object.keys(this)) {
      const value = this[key]
      if (typeof value === 'function') continue
      out[key] = value
    }
    return out
  }

  toJson() {
    return JSON.stringify(this.toJSON())
  }
}
