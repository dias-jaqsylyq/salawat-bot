# Salawat Challenge Bot

Backend for a month-long salawat counting challenge among a friend group during Mawlid month. All user interaction (registration, logging salawat, progress, leaderboard) happens in a separate [Telegram Mini App](https://core.telegram.org/bots/webapps) frontend (`salawat-miniapp`, deployed on Vercel), which talks to this repo's HTTP API. The bot process itself only sends the daily reminder and replies to `/start`/`/help` with a nudge to open the app.

## Architecture
One Node process runs two things side by side:
- A grammY bot using long polling (`/start`, `/help`, daily reminder scheduler, sets the chat menu button to open the Mini App).
- An Express HTTP API (`/api/*`) that the Mini App frontend calls directly, authenticated via Telegram `initData` — no separate login system.

Both share the same SQLite database (`db/repository.ts`) and challenge-date logic (`utils/challenge.ts`).

## Requirements
- Node.js 20+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

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
- `CHALLENGE_START_DATE` / `CHALLENGE_END_DATE` — actual Gregorian dates of this year's Mawlid month, `YYYY-MM-DD`.
- `TIMEZONE`, `REMINDER_TIME`, `DB_PATH` — same as before (defaults: `Asia/Hong_Kong`, `20:00`, `./data/salawat.db`).
- `PORT` — API port (defaults to `3000` locally; Railway injects this automatically in production).
- `CORS_ORIGIN` — origin(s) allowed to call the API. Defaults to `*` (placeholder) — **tighten to the real Vercel domain once the Mini App is deployed**, e.g. `https://salawat-miniapp.vercel.app`.
- `MINI_APP_URL` — the deployed Mini App's real HTTPS URL, used for the bot's chat menu button. Defaults to an obvious placeholder — **update once Vercel gives you a real domain**, then redeploy so the bot re-registers the menu button.
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
All endpoints require a valid Telegram `initData` on **every** request, sent as:
```
Authorization: tma <initData>
```
Requests with a missing or invalid header get `401 { success: false, error: "missing_init_data" | "invalid_init_data" }`. This is the exact convention the `salawat-miniapp` frontend must use — pass this along to that repo/session.

**POST /api/register** — body `{ nickname: string, goal: number }`
→ `200 { success: true, user: { id, nickname, goal } }` (idempotent — calling it again for an already-registered user just returns their existing record unchanged)
→ `400 { success: false, error: "invalid_nickname" | "invalid_goal" }`

**POST /api/log** — body `{ count: number }`
→ `200 { success: true, newTotal: number }`
→ `400 { success: false, error: "invalid_count" }`
→ `403 { success: false, error: "not_registered" }`

**GET /api/progress**
→ `200 { registered: false }` if not yet registered
→ `200 { registered: true, nickname, total, goal, percentComplete, daysLeft }`

**GET /api/leaderboard**
→ `200 { leaderboard: [{ nickname, total, rank }] }` — all registered users, ranked descending by total.

## Deploying (Railway)
This already assumes the service is on Railway per the original setup. To make the API publicly reachable for the Mini App:

1. **Settings → Networking → Generate Domain** on the service. Railway services aren't publicly reachable by default — this step is what gives you the `https://<something>.up.railway.app` HTTPS URL.
2. That URL is exactly what goes into the Mini App frontend's `VITE_API_URL`.
3. Build/start commands stay `npm install && npm run build` / `npm start` — same one service runs both the bot and the API, no second service needed.
4. Add the new env vars (`CORS_ORIGIN`, `MINI_APP_URL`, `MINI_APP_DEEP_LINK`, `PORT` if you want to override it, `INIT_DATA_MAX_AGE_SECONDS` if you want to override it) alongside the existing ones in the service's Variables panel.
5. Once you know the real Vercel domain, update `CORS_ORIGIN` and `MINI_APP_URL` in Railway and redeploy — the app reads them at boot, so nothing else needs to change.
6. Keep `DB_PATH` pointed at a persistent volume (as before) so data survives redeploys.

### Small VPS
Same as before — `npm install && npm run build`, run under `pm2`, keep `.env` on the server. Just make sure your firewall/reverse proxy exposes `PORT` over HTTPS (e.g. via nginx + Let's Encrypt) so the Mini App can reach `/api/*`.

## Bot commands
- `/start`, `/help` — both reply with a short message pointing at the chat menu button, which opens the Mini App.

## Notes / v1 scope
Per-user reminder times, streaks, group-chat announcements, admin CSV export, multi-timezone support, and manual count correction remain out of scope (see the original spec). Registration, logging, progress, and leaderboard now live entirely in the Mini App — see `salawatminiappspec.md` for that side.
