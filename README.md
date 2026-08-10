# Salawat Challenge Bot

Backend for a month-long salawat counting challenge among a friend group during Mawlid month. All user interaction (registration, logging salawat, progress, leaderboard) happens in a separate [Telegram Mini App](https://core.telegram.org/bots/webapps) frontend ([`salawat-miniapp`](https://github.com/dias-jaqsylyq/salawat-miniapp), deployed on Vercel), which talks to this repo's HTTP API. The bot process itself only sends the daily reminder and replies to `/start`/`/help` with a nudge to open the app.

## Architecture
One Node process runs two things side by side:
- A grammY bot using long polling (`/start`, `/help`, daily reminder scheduler, sets the chat menu button to open the Mini App).
- An Express HTTP API (`/api/*`) that the Mini App frontend calls directly, authenticated via Telegram `initData` — no separate login system.

Both share the same SQLite database (`db/repository.ts`) and challenge-date logic (`utils/challenge.ts`).

## Requirements
- Node.js 20+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- `sqlite3` CLI on the host if you want to run `npm run backup`

## 1. Install dependencies
```bash
npm install
```

## 2. Configure environment
```bash
cp .env.example .env
```

Open `.env` and set:
- `BOT_TOKEN` — **your real bot token from BotFather.** Gitignored, never committed.
- `CHALLENGE_START_DATE` / `CHALLENGE_END_DATE` — actual Gregorian dates of this year's Mawlid month, `YYYY-MM-DD` (start must be on or before end). Register/log and daily reminders are only accepted while this inclusive window is active.
- `TIMEZONE`, `REMINDER_TIME`, `DB_PATH` — defaults: `Asia/Hong_Kong`, `20:00`, `./data/salawat.db`.
- `PORT` — API port (defaults to `3000` locally; Railway injects this automatically in production).
- `CORS_ORIGIN` — origin(s) allowed to call the API. Defaults to `*` (dev placeholder). **Before go-live, set this to the real Vercel domain**, e.g. `https://salawat-miniapp.vercel.app` (comma-separated if you need more than one).
- `MINI_APP_URL` — the deployed Mini App's real HTTPS URL, used for the bot's chat menu button. Defaults to an obvious placeholder. **Before go-live, set this to the real Vercel URL and redeploy** so the menu button opens the app.
- `MINI_APP_DEEP_LINK` — `t.me/salawat_challenge_bot/challenge` deep link used in the daily reminder's button. Works today independent of the Vercel deployment.
- `INIT_DATA_MAX_AGE_SECONDS` — how old a Telegram `initData` payload can be before it's rejected as stale (default 24h).

**Never commit `.env` or paste your bot token anywhere public.** If a token leaks, revoke it via `@BotFather` → `/revoke`.

## 3. Run it
```bash
npm run dev      # development, auto-restarts on changes
# or
npm run build && npm start   # production
```

The bot uses long polling (no webhook needed), and the API listens on `PORT`. Data persists in the SQLite file at `DB_PATH` across restarts.

## HTTP API contract
All `/api/*` endpoints require a valid Telegram `initData` on **every** request, sent as:
```
Authorization: tma <initData>
```
Requests with a missing or invalid header get `401 { success: false, error: "missing_init_data" | "invalid_init_data" }`. This is the exact convention the `salawat-miniapp` frontend must use.

Unauthenticated:
- **GET /health** → `200 { ok: true }` (for Railway / uptime checks)

**POST /api/register** — body `{ nickname: string, goal: number }`
- `nickname`: trimmed length 1–50
- `goal`: integer, `1`…`100000000` inclusive
→ `200 { success: true, user: { id, nickname, goal } }` (idempotent — calling it again for an already-registered user just returns their existing record unchanged)
→ `400 { success: false, error: "invalid_nickname" | "invalid_goal" }`
→ `403 { success: false, error: "challenge_not_started" | "challenge_ended" }`

**POST /api/log** — body `{ count: number }`
- `count`: integer, `1`…`100000` inclusive
→ `200 { success: true, newTotal: number }`
→ `400 { success: false, error: "invalid_count" }`
→ `403 { success: false, error: "not_registered" | "challenge_not_started" | "challenge_ended" }`

**GET /api/progress**
→ `200 { registered: false }` if not yet registered
→ `200 { registered: true, nickname, total, goal, percentComplete, daysLeft }`

**GET /api/leaderboard**
→ `200 { leaderboard: [{ nickname, total, rank }] }` — all registered users, ranked descending by total.

## Deploying (Railway)
This already assumes the service is on Railway per the original setup. To make the API publicly reachable for the Mini App:

1. **Settings → Networking → Generate Domain** on the service. Railway services aren't publicly reachable by default — this step is what gives you the `https://<service>.up.railway.app` HTTPS URL.
2. That URL is exactly what goes into the Mini App frontend's `VITE_API_URL`.
3. Build/start commands stay `npm install && npm run build` / `npm start` — same one service runs both the bot and the API, no second service needed.
4. Add the env vars (`CORS_ORIGIN`, `MINI_APP_URL`, `MINI_APP_DEEP_LINK`, `PORT` if you want to override it, `INIT_DATA_MAX_AGE_SECONDS` if you want to override it) alongside the existing ones in the service's Variables panel.
5. Once you know the real Vercel domain, update **both** `CORS_ORIGIN` and `MINI_APP_URL` in Railway and redeploy — the app reads them at boot, so nothing else needs to change. Leaving either as a placeholder means CORS will stay open (`*`) and/or the chat menu button will point at a dead URL.
6. **Attach a persistent volume** so the SQLite file survives redeploys:
   - Railway service → **Settings → Volumes** → Add Volume (e.g. mount path `/data`).
   - Set `DB_PATH=/data/salawat.db` in Variables.
   - Redeploy. Without a volume, every redeploy starts with an empty database.

### Backups
Railway volumes are **not** automatically snapshotted by anything this app configures. The DB runs in WAL mode, so a naive copy of only `salawat.db` mid-write can miss uncheckpointed data in `salawat.db-wal`. Use the online backup API instead:

```bash
npm run backup   # writes data/backups/salawat-<UTC timestamp>.db via sqlite3 .backup
```

Schedule that periodically (host cron, Railway cron job, or a one-off shell on the volume). Copy backup files off the volume to somewhere durable if the challenge data matters.

### Small VPS
Same idea — `npm install && npm run build`, run under `pm2`, keep `.env` on the server. Expose `PORT` over HTTPS (e.g. via nginx + Let's Encrypt) so the Mini App can reach `/api/*`. Point `DB_PATH` at a durable disk path and run `npm run backup` on a cron.

## Bot commands
- `/start`, `/help` — both reply with a short message pointing at the chat menu button, which opens the Mini App.

## Notes / v1 scope
Per-user reminder times, streaks, group-chat announcements, admin CSV export, multi-timezone support, and manual count correction remain out of scope (see the original spec). Registration, logging, progress, and leaderboard live in the Mini App — see the [`salawat-miniapp`](https://github.com/dias-jaqsylyq/salawat-miniapp) README for that side.
