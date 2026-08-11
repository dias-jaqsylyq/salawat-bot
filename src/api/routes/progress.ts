import type { Request, Response } from "express";
import { config } from "../../config.js";
import { getUserByTelegramId, getUserLogsSince, getUserTodayTotal, getUserTotal } from "../../db/repository.js";
import {
  dayKeyFromSqliteUtc,
  formatDateParts,
  getChallengeStatus,
  getDaysLeft,
  getTodayInTimezone,
  getTodayUtcRange,
  getUtcRangeForDate,
} from "../../utils/challenge.js";
import { bucketLogsByDay, buildLast7Days, computeStreak } from "../../utils/streak.js";

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

  const todayParts = getTodayInTimezone(config.timezone);
  const challengeStartUtc = getUtcRangeForDate(config.challengeStartDate).startUtc;
  const logs = getUserLogsSince(user.id, challengeStartUtc);
  const totalsByDate = bucketLogsByDay(logs, (loggedAt) =>
    dayKeyFromSqliteUtc(loggedAt, config.timezone)
  );

  const dailyGoal = user.goal;
  const streak = computeStreak(dailyGoal, totalsByDate, todayParts, config.challengeStartDate);
  const last7Days = buildLast7Days(dailyGoal, totalsByDate, todayParts);

  res.json({
    registered: true,
    nickname: user.nickname,
    total,
    todayTotal,
    dailyGoal,
    streak,
    last7Days,
    daysLeft: getDaysLeft(),
    ...challengeMeta(),
  });
}
