import type { Request, Response } from "express";
import {
  LOG_DAILY_COUNT_CAP,
  LOG_RATE_LIMIT_PER_MINUTE,
  MAX_LOG_COUNT,
} from "../../config.js";
import { allowDailyCount, allowRequest } from "../rateLimit.js";
import { addLog, getUserByTelegramId, getUserTotal } from "../../db/repository.js";
import {
  getDayKeyInTimezone,
  hasChallengeEnded,
  hasChallengeStarted,
} from "../../utils/challenge.js";

export function logRoute(req: Request, res: Response) {
  const { count } = req.body ?? {};

  if (typeof count !== "number" || !Number.isInteger(count) || count <= 0 || count > MAX_LOG_COUNT) {
    res.status(400).json({ success: false, error: "invalid_count" });
    return;
  }

  if (!hasChallengeStarted()) {
    res.status(403).json({ success: false, error: "challenge_not_started" });
    return;
  }
  if (hasChallengeEnded()) {
    res.status(403).json({ success: false, error: "challenge_ended" });
    return;
  }

  if (!allowRequest(req.telegramId, LOG_RATE_LIMIT_PER_MINUTE)) {
    res.status(429).json({ success: false, error: "rate_limited" });
    return;
  }

  const user = getUserByTelegramId(req.telegramId);
  if (!user) {
    res.status(403).json({ success: false, error: "not_registered" });
    return;
  }

  if (!allowDailyCount(req.telegramId, getDayKeyInTimezone(), count, LOG_DAILY_COUNT_CAP)) {
    res.status(429).json({ success: false, error: "rate_limited" });
    return;
  }

  addLog(user.id, count);
  const newTotal = getUserTotal(user.id);
  res.json({ success: true, newTotal });
}
