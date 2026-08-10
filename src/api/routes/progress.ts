import type { Request, Response } from "express";
import { getUserByTelegramId, getUserTotal } from "../../db/repository.js";
import { getDaysLeft, getPercentComplete } from "../../utils/challenge.js";

export function progressRoute(req: Request, res: Response) {
  const user = getUserByTelegramId(req.telegramId);
  if (!user) {
    res.json({ registered: false });
    return;
  }

  const total = getUserTotal(user.id);
  res.json({
    registered: true,
    nickname: user.nickname,
    total,
    goal: user.goal,
    percentComplete: getPercentComplete(total, user.goal),
    daysLeft: getDaysLeft(),
  });
}
