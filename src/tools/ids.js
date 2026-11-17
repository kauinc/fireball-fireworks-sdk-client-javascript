let deviceSequence = 0
let requestNum = 0

export function getNextDeviceSequence() {
  return deviceSequence++
}

export function resetDeviceSequence() {
  deviceSequence = 0
}

export function getNowTimestampMilliSeconds() {
  return Date.now()
}

export function generateActionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const timestamp = getNowTimestampMilliSeconds()
  if (requestNum >= timestamp) requestNum += 1
  else requestNum = timestamp
  return String(requestNum)
}

export function generateConnectionToken() {
  return generateActionId()
}

/**
 * @param {string} url
 * @param {Record<string, string|number|undefined|null>} [params]
 */
export function formatUrlAndParams(url, params) {
  if (!params) return url
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  )
  if (entries.length === 0) return url
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return `${url}${url.includes('?') ? '&' : '?'}${qs}`
}
