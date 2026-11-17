# fireball-fireworks-sdk-client (JavaScript)

Framework-agnostic Fireball RGS client SDK for the browser.

Same role as the Unity package `com.fireball.unitysdk`: connect to Fireball, authorize, send game messages over HTTP router + SignalR, and talk to the operator shell via GCI.

## Install

```bash
npm install
```

From another project (local path or published package):

```bash
npm install file:../fireball-fireworks-sdk-client-javascript
```

## Quick start

```js
import {
  FireballClient,
  AuthRequest,
  createRequest,
  setFireballLogLevel,
  LogLevels,
} from 'fireball-fireworks-sdk-client'

setFireballLogLevel(LogLevels.Information)

const fireball = new FireballClient()

// Parse launch URL query (operatorId, gameId, token, …) or pass settings:
await fireball.init({
  operatorId: 'my-op',
  gameId: 'doof-troop',
  token: '…',
  environment: 'development',
  gameMode: 'fun',
})

// Demo wallet (local) or real auth:
await fireball.demoAuthorize({ currency: 'USD', balance: 100000 })
// await fireball.authorize(new AuthRequest(fireball.session))

// Game-specific message (schema lives in the game, not in the SDK):
const req = createRequest('place-chip', fireball.session, null, {
  RoundId: 'round-1',
  ChipValue: 1,
})
const response = await fireball.sendRequest(req)

fireball.on('connectionError', (e) => console.error(e.detail))
fireball.gci.sendLoadingComplete()
fireball.gci.sendReadyToPlay()
```

## API

| Method | Description |
| --- | --- |
| `init(settingsOrUrl?)` | Build session + SignalR connect |
| `authorize(authRequest?)` | Authenticate via RGS |
| `demoAuthorize({ currency, balance })` | Local fun/demo session |
| `sendRequest(request, { timeout, attempts })` | POST `/router`, wait WS by `ActionId` |
| `getBalance(request?)` | Balance request |
| `resendFailedRequest()` | Flag last failed request for retry flow |
| `goHomePage()` | Navigate to `home` URL or GCI close |
| `gci` | Operator ↔ game bridge |

Events: `connectionError`, `serverMessage`, `broadcastMessage`, `jackpotUpdate`.

## Scripts

```bash
npm test
npm run smoke
```

## Notes

- DoofTroop / game message names (`place-chip`, `lock-bets`, …) belong in the game client, same as Unity samples.
- React / Angular / Vue: import this package directly — no framework dependency.
