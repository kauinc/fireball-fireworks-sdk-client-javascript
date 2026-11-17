import { BaseMessage } from './BaseMessage.js'

export class BaseResponse extends BaseMessage {
  constructor(data = {}) {
    super(data)
    this.client_side = data.client_side ?? data.clientSide ?? null
    this.Variant = data.Variant ?? data.variant ?? 1
  }

  toJSON() {
    return {
      ...super.toJSON(),
      client_side: this.client_side,
      Variant: this.Variant,
    }
  }
}
