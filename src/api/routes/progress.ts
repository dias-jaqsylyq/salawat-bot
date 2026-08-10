import type { Request, Response } from "express";
import { config } from "../../config.js";
import { getUserByTelegramId, getUserTotal } from "../../db/repository.js";
import {
  formatDateParts,
  getChallengeStatus,
  getDaysLeft,
  getPercentComplete,
} from "../../utils/challenge.js";

function challengeMeta() {
  return {
    challengeStatus: getChallengeStatus(),
    challengeStartDate: formatDateParts(config.challengeStartDate),
    challengeEndDate: formatDateParts(config.challengeEndDate),
  };
}

export function progressRoute(req: Request, res: Response) {
  const user = getUserByTelegramId(req.telegramId);
  if (!user) {
    res.json({ registered: false, ...challengeMeta() });
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
    ...challengeMeta(),
  });
}
