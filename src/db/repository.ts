import { db } from "./client.js";
import type { ExportRow, LeaderboardRow, User } from "../types.js";

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

export function createUser(telegramId: number, nickname: string, goal: number): User {
  const result = db
    .prepare("INSERT INTO users (telegram_id, nickname, goal) VALUES (?, ?, ?)")
    .run(telegramId, nickname, goal);
  return getUserByTelegramId(telegramId) ?? (() => {
    throw new Error(`Failed to load user just created (rowid ${result.lastInsertRowid})`);
  })();
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

export function getLeaderboard(): LeaderboardRow[] {
  return db
    .prepare(
      `SELECT u.nickname AS nickname, COALESCE(SUM(l.count), 0) AS total
       FROM users u
       LEFT JOIN logs l ON l.user_id = u.id
       GROUP BY u.id
       ORDER BY total DESC, u.nickname ASC`
    )
    .all() as LeaderboardRow[];
}

export function getAllUsers(): User[] {
  return db.prepare("SELECT * FROM users").all() as User[];
}

/** Full leaderboard rows for admin CSV export (includes telegram_id + goal). */
export function getExportRows(): ExportRow[] {
  return db
    .prepare(
      `SELECT u.nickname AS nickname,
              u.telegram_id AS telegram_id,
              u.goal AS goal,
              COALESCE(SUM(l.count), 0) AS total
       FROM users u
       LEFT JOIN logs l ON l.user_id = u.id
       GROUP BY u.id
       ORDER BY total DESC, u.nickname ASC`
    )
    .all() as ExportRow[];
}
