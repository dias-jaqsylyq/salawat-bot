# Salawat Challenge Bot

A Telegram bot for a month-long salawat counting challenge among a friend group during Mawlid month. Users register with `/start`, log salawat with `/salawat <number>`, and track progress with `/myprogress` and `/leaderboard`. A daily reminder nudges everyone to log their count.

## Requirements
- Node.js 20+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## 1. Install dependencies
```bash
npm install
```

## 2. Configure your bot token and challenge dates
Copy the example env file and fill it in:
```bash
cp .env.example .env
```

Open `.env` and set:
- `BOT_TOKEN` — **put your real bot token from BotFather here.** This file is gitignored and never committed.
- `CHALLENGE_START_DATE` / `CHALLENGE_END_DATE` — the actual Gregorian dates of this year's Mawlid month (Rabi' al-Awwal), `YYYY-MM-DD` format.
- `TIMEZONE` — IANA timezone for the daily reminder and "days left" math (defaults to `Asia/Hong_Kong`).
- `REMINDER_TIME` — 24h `HH:mm` time the daily reminder fires (defaults to `20:00`).
- `DB_PATH` — where the SQLite file lives (defaults to `./data/salawat.db`).

**Never commit `.env` or paste your bot token into chat, code, or a public repo.** If a token ever leaks, revoke it immediately via `@BotFather` → `/revoke`.

## 3. Run it

**Development** (auto-restarts on file changes):
```bash
npm run dev
```

**Production**:
```bash
npm run build
npm start
```

The bot uses long polling, so no public URL, webhook, or open port is required — it just needs to stay running and have outbound internet access to `api.telegram.org`.

Data persists in the SQLite file at `DB_PATH` across restarts.

## Deployment options

Any host that can keep a long-running Node process alive works. Two easy options:

### Railway / Render (recommended for simplicity)
1. Push this repo to GitHub.
2. Create a new service from the repo on [Railway](https://railway.app) or [Render](https://render.com).
3. Set the build command to `npm install && npm run build` and the start command to `npm start`.
4. Add the same environment variables from `.env` (`BOT_TOKEN`, `CHALLENGE_START_DATE`, `CHALLENGE_END_DATE`, `TIMEZONE`, `REMINDER_TIME`) in the service's environment variable settings — **this is where your real bot token goes in production, not in a committed file.**
5. Add a persistent volume/disk mounted so `DB_PATH` (e.g. `/data/salawat.db`) survives redeploys — otherwise the SQLite file resets each deploy. Both Railway and Render support attaching a small persistent volume to a service.

### Small VPS
1. Clone the repo, run `npm install && npm run build`.
2. Create `.env` on the server with your real values (`scp` it over or create it directly with a terminal editor — never commit it).
3. Run it under a process manager so it survives reboots/crashes, e.g.:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name salawat-bot
   pm2 save
   pm2 startup
   ```
4. The SQLite file at `DB_PATH` lives on the VPS disk — back it up periodically if you care about the data.

## Commands
- `/start` — register (nickname → monthly goal → confirm)
- `/salawat <number>` — log salawat, e.g. `/salawat 100`
- `/myprogress` — your total, goal, % complete, days left
- `/leaderboard` — everyone ranked by total logged salawat
- `/help` — list commands

## Notes / v1 scope
Per-user reminder times, streaks, group-chat announcements, admin CSV export, multi-timezone support, and manual count correction are intentionally out of scope for this MVP (see the original spec).
