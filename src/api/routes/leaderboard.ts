import type { Request, Response } from "express";
import { getLeaderboard } from "../../db/repository.js";

export function leaderboardRoute(_req: Request, res: Response) {
  const rows = getLeaderboard();
  res.json({
    leaderboard: rows.map((row, i) => ({ nickname: row.nickname, total: row.total, rank: i + 1 })),
  });
}
