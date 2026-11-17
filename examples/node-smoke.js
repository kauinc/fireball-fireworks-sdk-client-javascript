/**
 * Live hub smoke: SignalR connect + demoAuthorize (no real operator token).
 * Usage: npm run smoke
 */
import {
  FireballClient,
  setFireballLogLevel,
  LogLevels,
} from '../src/index.js'

setFireballLogLevel(LogLevels.Information)

const client = new FireballClient()

try {
  console.log('init…')
  const session = await client.init({
    operatorId: 'smoke-test',
    gameId: 'smoke-game',
    token: 'smoke-token',
    environment: 'development',
    gameMode: 'fun',
    currency: 'USD',
  })
  console.log('connected', {
    connectionId: session.connectionId,
    isInit: client.isInit,
    isConnected: client.isConnected,
  })

  const auth = await client.demoAuthorize({ currency: 'USD', balance: 54321 })
  console.log('demoAuthorize', {
    balance: auth.Balance,
    currency: auth.Currency,
    playerId: auth.PlayerId,
    gameSession: auth.GameSession,
    isAuth: client.isAuth,
    isDemo: client.isDemo,
  })

  console.log('SMOKE OK')
  await client.dispose()
  process.exit(0)
} catch (e) {
  console.error('SMOKE FAIL', e?.Reason ?? e?.message ?? e)
  try {
    await client.dispose()
  } catch {
    /* ignore */
  }
  process.exit(1)
}
