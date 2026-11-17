export class ServerMessage {
  /**
   * @param {string} actionId
   * @param {string} name
   * @param {Record<string, unknown>|null} message
   */
  constructor(actionId, name, message) {
    this.actionId = actionId
    this.name = name
    this.message = message
  }

  get ActionId() {
    return this.actionId
  }

  get Name() {
    return this.name
  }

  getMessage() {
    return this.message
  }
}
