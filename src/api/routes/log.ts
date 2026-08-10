import type { Request, Response } from "express";
import { addLog, getUserByTelegramId, getUserTotal } from "../../db/repository.js";

export function logRoute(req: Request, res: Response) {
  const { count } = req.body ?? {};

  if (typeof count !== "number" || !Number.isInteger(count) || count <= 0) {
    res.status(400).json({ success: false, error: "invalid_count" });
    return;
  }

  const user = getUserByTelegramId(req.telegramId);
  if (!user) {
    res.status(403).json({ success: false, error: "not_registered" });
    return;
  }

  addLog(user.id, count);
  const newTotal = getUserTotal(user.id);
  res.json({ success: true, newTotal });
}
