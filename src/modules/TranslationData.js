/**
 * @typedef {object} TranslationData
 * @property {string} [id]
 * @property {string} [appName]
 * @property {Record<string, string>} translation
 */

/**
 * Flatten nested translation objects into a flat key → string map.
 * Nested paths use `.` (e.g. `{ label: { balance: "BALANCE" } }` → `label.balance`).
 * Existing flat keys like `label_balance` are preserved as-is.
 *
 * @param {unknown} value
 * @param {string} [prefix]
 * @param {Record<string, string>} [out]
 * @returns {Record<string, string>}
 */
export function flattenTranslation(value, prefix = '', out = {}) {
  if (value == null) return out

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    if (prefix) out[prefix] = String(value)
    return out
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const next = prefix ? `${prefix}.${index}` : String(index)
      flattenTranslation(item, next, out)
    })
    return out
  }

  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key
      flattenTranslation(child, next, out)
    }
  }

  return out
}

/**
 * Parse Fireball Translation API JSON body.
 * Expected shape: `{ statusCode, data: { id, appName, translation } }` (camelCase).
 *
 * @param {string} json
 * @returns {TranslationData}
 */
export function parseTranslationResponse(json) {
  let body
  try {
    body = typeof json === 'string' ? JSON.parse(json) : json
  } catch (e) {
    const err = new Error(`Translation parse error: ${e?.message ?? e}`)
    err.cause = e
    throw err
  }

  if (!body || typeof body !== 'object') {
    throw new Error('Translation parse error: empty body')
  }

  const data = body.data ?? body.Data
  if (!data || typeof data !== 'object') {
    throw new Error('Translation parse error: missing data')
  }

  const raw =
    data.translation ??
    data.Translation ??
    data.translations ??
    data.Translations ??
    {}

  return {
    id: data.id ?? data.Id ?? '',
    appName: data.appName ?? data.AppName ?? '',
    translation: flattenTranslation(raw),
  }
}
