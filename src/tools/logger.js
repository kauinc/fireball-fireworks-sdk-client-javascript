import { LogLevels } from '../core/FireballConfig.js'

let currentLevel = LogLevels.Information

export function setLogLevel(level) {
  currentLevel = level
}

export function getLogLevel() {
  return currentLevel
}

function write(level, tag, args) {
  if (level > currentLevel) return
  const prefix = tag ? `[Fireball${tag ? `:${tag}` : ''}]` : '[Fireball]'
  if (level === LogLevels.Error) console.error(prefix, ...args)
  else if (level === LogLevels.Warning) console.warn(prefix, ...args)
  else console.log(prefix, ...args)
}

export function createLogger(tag = '') {
  return {
    log: (...args) => write(LogLevels.Information, tag, args),
    info: (...args) => write(LogLevels.Information, tag, args),
    warning: (...args) => write(LogLevels.Warning, tag, args),
    error: (...args) => write(LogLevels.Error, tag, args),
    debug: (...args) => write(LogLevels.Debug, tag, args),
  }
}
