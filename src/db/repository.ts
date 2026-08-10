import { db } from "./client.js";
import type { LeaderboardRow, User } from "../types.js";

export function getUserByTelegramId(telegramId: number): User | undefined {
  return db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegramId) as User | undefined;
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
