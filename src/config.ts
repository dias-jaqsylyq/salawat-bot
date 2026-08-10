import "dotenv/config";
import type { DateParts } from "./types.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateParts(name: string, value: string): DateParts {
  const match = DATE_RE.exec(value);
  if (!match) {
    throw new Error(`Invalid date for ${name}: "${value}" (expected YYYY-MM-DD)`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function toEpochDay(parts: DateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
}

function parseReminderTime(value: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid REMINDER_TIME: "${value}" (expected HH:mm)`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid REMINDER_TIME: "${value}" (hour must be 0–23, minute 0–59)`);
  }
  return { hour, minute };
}

const challengeStartDate = parseDateParts("CHALLENGE_START_DATE", required("CHALLENGE_START_DATE"));
const challengeEndDate = parseDateParts("CHALLENGE_END_DATE", required("CHALLENGE_END_DATE"));

if (toEpochDay(challengeStartDate) > toEpochDay(challengeEndDate)) {
  throw new Error(
    `CHALLENGE_START_DATE must be on or before CHALLENGE_END_DATE (got start after end)`
  );
}

/** Per-request log count ceiling (friend-group sanity cap). */
export const MAX_LOG_COUNT = 100_000;
/** Registration goal ceiling (friend-group sanity cap). */
export const MAX_GOAL = 100_000_000;

export const config = {
  botToken: required("BOT_TOKEN"),
  challengeStartDate,
  challengeEndDate,
  timezone: process.env.TIMEZONE ?? "Asia/Hong_Kong",
  reminderTime: parseReminderTime(process.env.REMINDER_TIME ?? "20:00"),
  dbPath: process.env.DB_PATH ?? "./data/salawat.db",

  // Mini App backend config
  port: Number(process.env.PORT) || 3000,
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  // Real HTTPS URL of the deployed Mini App (Vercel), used for the chat menu button.
  // Placeholder until the frontend is deployed — update in Railway and redeploy.
  miniAppUrl: process.env.MINI_APP_URL ?? "https://example.com/REPLACE_WITH_VERCEL_URL",
  // t.me deep link used for the reminder's inline button (works without a real HTTPS Mini App URL).
  miniAppDeepLink: process.env.MINI_APP_DEEP_LINK ?? "https://t.me/salawat_challenge_bot/challenge",
  // Max age (seconds) a Telegram initData payload is accepted before being treated as stale/replayed.
  initDataMaxAgeSeconds: Number(process.env.INIT_DATA_MAX_AGE_SECONDS) || 86_400,
};
