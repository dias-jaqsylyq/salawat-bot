import type { Request, Response } from "express";
import { addLog, getUserByTelegramId, getUserTotal } from "../../db/repository.js";

const MAX_LOG_COUNT = 10_000;

export function logRoute(req: Request, res: Response) {
  const { count } = req.body ?? {};

  if (typeof count !== "number" || !Number.isInteger(count) || count === 0) {
    res.status(400).json({ success: false, error: "invalid_count" });
    return;
  }

  if (count > MAX_LOG_COUNT) {
    res.status(400).json({ success: false, error: "count_too_large" });
    return;
  }

  const user = getUserByTelegramId(req.telegramId);
  if (!user) {
    res.status(403).json({ success: false, error: "not_registered" });
    return;
  }

  const currentTotal = getUserTotal(user.id);
  const newTotal = currentTotal + count;
  
  if (newTotal < 0) {
    res.status(400).json({ success: false, error: "would_result_in_negative_total" });
    return;
  }

  addLog(user.id, count);
  res.json({ success: true, newTotal });
}