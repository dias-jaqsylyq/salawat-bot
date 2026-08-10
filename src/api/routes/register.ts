import type { Request, Response } from "express";
import { createUser, getUserByTelegramId } from "../../db/repository.js";

export function registerRoute(req: Request, res: Response) {
  const { nickname, goal } = req.body ?? {};

  if (typeof nickname !== "string" || nickname.trim().length === 0 || nickname.trim().length > 50) {
    res.status(400).json({ success: false, error: "invalid_nickname" });
    return;
  }
  if (typeof goal !== "number" || !Number.isInteger(goal) || goal <= 0) {
    res.status(400).json({ success: false, error: "invalid_goal" });
    return;
  }

  const existing = getUserByTelegramId(req.telegramId);
  if (existing) {
    res.json({
      success: true,
      user: { id: existing.id, nickname: existing.nickname, goal: existing.goal },
    });
    return;
  }

  const user = createUser(req.telegramId, nickname.trim(), goal);
  res.json({ success: true, user: { id: user.id, nickname: user.nickname, goal: user.goal } });
}
