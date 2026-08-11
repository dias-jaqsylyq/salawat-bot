import type { Request, Response } from "express";
import { config } from "../../config.js";
import { getUserByTelegramId, getUserTodayTotal, getUserTotal } from "../../db/repository.js";
import {
  formatDateParts,
  getChallengeStatus,
  getDaysLeft,
  getPercentComplete,
  getTodayUtcRange,
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
  const { startUtc, endUtc } = getTodayUtcRange();
  const todayTotal = getUserTodayTotal(user.id, startUtc, endUtc);
  res.json({
    registered: true,
    nickname: user.nickname,
    total,
    todayTotal,
    goal: user.goal,
    percentComplete: getPercentComplete(total, user.goal),
    daysLeft: getDaysLeft(),
    ...challengeMeta(),
  });
}
