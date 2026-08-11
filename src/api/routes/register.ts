import type { Request, Response } from "express";
import { MAX_GOAL, REGISTER_RATE_LIMIT_PER_MINUTE } from "../../config.js";
import { allowRequest } from "../rateLimit.js";
import { createUser, getUserByTelegramId, isNicknameTaken } from "../../db/repository.js";
import { hasChallengeEnded } from "../../utils/challenge.js";

export function registerRoute(req: Request, res: Response) {
  const { nickname, goal } = req.body ?? {};

  if (typeof nickname !== "string" || nickname.trim().length === 0 || nickname.trim().length > 50) {
    res.status(400).json({ success: false, error: "invalid_nickname" });
    return;
  }
  if (typeof goal !== "number" || !Number.isInteger(goal) || goal <= 0 || goal > MAX_GOAL) {
    res.status(400).json({ success: false, error: "invalid_goal" });
    return;
  }

  if (!allowRequest(req.telegramId, REGISTER_RATE_LIMIT_PER_MINUTE)) {
    res.status(429).json({ success: false, error: "rate_limited" });
    return;
  }

  if (hasChallengeEnded()) {
    res.status(403).json({ success: false, error: "challenge_ended" });
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

  const trimmed = nickname.trim();
  if (isNicknameTaken(trimmed)) {
    res.status(409).json({ success: false, error: "nickname_taken" });
    return;
  }

  try {
    const user = createUser(req.telegramId, trimmed, goal, req.telegramProfile);
    res.json({ success: true, user: { id: user.id, nickname: user.nickname, goal: user.goal } });
  } catch (err) {
    // Parallel first-time register: UNIQUE(telegram_id) — treat as idempotent success.
    const raced = getUserByTelegramId(req.telegramId);
    if (raced) {
      res.json({
        success: true,
        user: { id: raced.id, nickname: raced.nickname, goal: raced.goal },
      });
      return;
    }
    // Parallel nickname grab
    if (isNicknameTaken(trimmed)) {
      res.status(409).json({ success: false, error: "nickname_taken" });
      return;
    }
    throw err;
  }
}
