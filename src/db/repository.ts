import { db } from "./client.js";
import type { ExportRow, LeaderboardRow, TelegramProfile, User } from "../types.js";

export function getUserByTelegramId(telegramId: number): User | undefined {
  return db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegramId) as User | undefined;
}

/** Case-insensitive nickname collision check (excludes an optional telegram_id). */
export function isNicknameTaken(nickname: string, excludeTelegramId?: number): boolean {
  const row = (
    excludeTelegramId === undefined
      ? db.prepare("SELECT 1 AS hit FROM users WHERE LOWER(nickname) = LOWER(?) LIMIT 1").get(nickname)
      : db
          .prepare(
            "SELECT 1 AS hit FROM users WHERE LOWER(nickname) = LOWER(?) AND telegram_id != ? LIMIT 1"
          )
          .get(nickname, excludeTelegramId)
  ) as { hit: number } | undefined;
  return row !== undefined;
}

export function createUser(
  telegramId: number,
  nickname: string,
  goal: number,
  profile: TelegramProfile = {
    telegramUsername: null,
    telegramFirstName: null,
    telegramLastName: null,
  }
): User {
  const result = db
    .prepare(
      `INSERT INTO users (
         telegram_id, nickname, goal,
         telegram_username, telegram_first_name, telegram_last_name
       ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      telegramId,
      nickname,
      goal,
      profile.telegramUsername,
      profile.telegramFirstName,
      profile.telegramLastName
    );
  return getUserByTelegramId(telegramId) ?? (() => {
    throw new Error(`Failed to load user just created (rowid ${result.lastInsertRowid})`);
  })();
}

/** Refresh Telegram profile fields if the user is already registered; no-op otherwise. */
export function updateTelegramProfileIfRegistered(
  telegramId: number,
  profile: TelegramProfile
): void {
  db.prepare(
    `UPDATE users
     SET telegram_username = ?,
         telegram_first_name = ?,
         telegram_last_name = ?
     WHERE telegram_id = ?`
  ).run(
    profile.telegramUsername,
    profile.telegramFirstName,
    profile.telegramLastName,
    telegramId
  );
}

export function addLog(userId: number, count: number): void {
  db.prepare("INSERT INTO logs (user_id, count) VALUES (?, ?)").run(userId, count);
}

export function getUserTotal(userId: number): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(count), 0) AS total FROM logs WHERE user_id = ?")
    .get(userId) as { total: number };
  return row.total;
}

/** Sum of logs for a user in the half-open UTC window [startUtc, endUtc). */
export function getUserTodayTotal(userId: number, startUtc: string, endUtc: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(count), 0) AS total
       FROM logs
       WHERE user_id = ? AND logged_at >= ? AND logged_at < ?`
    )
    .get(userId, startUtc, endUtc) as { total: number };
  return row.total;
}

/** Individual log counts at/after startUtc (for TIMEZONE day bucketing). */
export function getUserLogsSince(
  userId: number,
  startUtc: string
): { logged_at: string; count: number }[] {
  return db
    .prepare(
      `SELECT logged_at, count
       FROM logs
       WHERE user_id = ? AND logged_at >= ?
       ORDER BY logged_at ASC`
    )
    .all(userId, startUtc) as { logged_at: string; count: number }[];
}

/** Day goal overrides in [fromDay, toDay] inclusive (YYYY-MM-DD keys). */
export function getDayOverrides(
  userId: number,
  fromDay: string,
  toDay: string
): Map<string, boolean> {
  const rows = db
    .prepare(
      `SELECT day, met
       FROM day_goal_overrides
       WHERE user_id = ? AND day >= ? AND day <= ?`
    )
    .all(userId, fromDay, toDay) as { day: string; met: number }[];
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(row.day, row.met === 1);
  }
  return map;
}

/** Upsert a per-day met/missed override (does not change logs). */
export function upsertDayOverride(userId: number, day: string, met: boolean): void {
  db.prepare(
    `INSERT INTO day_goal_overrides (user_id, day, met, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, day) DO UPDATE SET
       met = excluded.met,
       updated_at = excluded.updated_at`
  ).run(userId, day, met ? 1 : 0);
}

export function getLeaderboard(): LeaderboardRow[] {
  return db
    .prepare(
      `SELECT u.nickname AS nickname,
              u.telegram_id AS telegram_id,
              COALESCE(SUM(l.count), 0) AS total
       FROM users u
       LEFT JOIN logs l ON l.user_id = u.id
       GROUP BY u.id
       ORDER BY total DESC, u.nickname ASC`
    )
    .all() as LeaderboardRow[];
}

/** Sum of all registered users' all-time salawat totals. */
export function getJamaatTotal(): number {
  const row = db
    .prepare(`SELECT COALESCE(SUM(count), 0) AS total FROM logs`)
    .get() as { total: number };
  return row.total;
}

export function getAllUsers(): User[] {
  return db.prepare("SELECT * FROM users").all() as User[];
}

/** Users who opted into daily reminders. */
export function getUsersWithRemindersEnabled(): User[] {
  return db
    .prepare("SELECT * FROM users WHERE reminder_enabled = 1")
    .all() as User[];
}

export interface UserProfileUpdate {
  nickname?: string;
  goal?: number;
  reminderEnabled?: boolean;
  /** HH:mm override, or null to clear back to global default. */
  reminderTime?: string | null;
}

export function updateUserProfile(telegramId: number, update: UserProfileUpdate): User {
  const user = getUserByTelegramId(telegramId);
  if (!user) {
    throw new Error(`updateUserProfile: user ${telegramId} not found`);
  }

  const nickname = update.nickname ?? user.nickname;
  const goal = update.goal ?? user.goal;
  const reminderEnabled =
    update.reminderEnabled !== undefined ? (update.reminderEnabled ? 1 : 0) : user.reminder_enabled;
  const reminderTime =
    update.reminderTime !== undefined ? update.reminderTime : user.reminder_time;

  db.prepare(
    `UPDATE users
     SET nickname = ?, goal = ?, reminder_enabled = ?, reminder_time = ?
     WHERE telegram_id = ?`
  ).run(nickname, goal, reminderEnabled, reminderTime, telegramId);

  return getUserByTelegramId(telegramId) ?? (() => {
    throw new Error(`Failed to reload user ${telegramId} after profile update`);
  })();
}

/** Full leaderboard rows for admin CSV export (includes telegram_id + goal + profile). */
export function getExportRows(): ExportRow[] {
  return db
    .prepare(
      `SELECT u.nickname AS nickname,
              u.telegram_id AS telegram_id,
              u.telegram_username AS telegram_username,
              u.telegram_first_name AS telegram_first_name,
              u.telegram_last_name AS telegram_last_name,
              u.goal AS goal,
              COALESCE(SUM(l.count), 0) AS total
       FROM users u
       LEFT JOIN logs l ON l.user_id = u.id
       GROUP BY u.id
       ORDER BY total DESC, u.nickname ASC`
    )
    .all() as ExportRow[];
}
