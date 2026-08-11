import { config } from "../../config.js";
import {
  getDayOverrides,
  getUserLogsSince,
  getUserTodayTotal,
  getUserTotal,
} from "../../db/repository.js";
import type { User } from "../../types.js";
import {
  dayKeyFromSqliteUtc,
  formatDateParts,
  getDaysLeft,
  getTodayInTimezone,
  getTodayUtcRange,
  getUtcRangeForDate,
  subtractOneCalendarDay,
} from "../../utils/challenge.js";
import { bucketLogsByDay, buildLast7Days, computeStreak } from "../../utils/streak.js";

/** Shared streak + last7Days (+ totals) for progress and day-override responses. */
export function computeUserProgressFields(user: User) {
  const total = getUserTotal(user.id);
  const { startUtc, endUtc } = getTodayUtcRange();
  const todayTotal = getUserTodayTotal(user.id, startUtc, endUtc);

  const todayParts = getTodayInTimezone(config.timezone);
  let windowStart = todayParts;
  for (let i = 0; i < 6; i++) {
    windowStart = subtractOneCalendarDay(windowStart);
  }
  const windowStartKey = formatDateParts(windowStart);
  const todayKey = formatDateParts(todayParts);
  const challengeStartKey = formatDateParts(config.challengeStartDate);

  // Fetch logs from the earlier of challenge start and the visible 7-day window.
  const logsFromKey =
    windowStartKey < challengeStartKey ? windowStartKey : challengeStartKey;
  const logsFromParts =
    logsFromKey === challengeStartKey ? config.challengeStartDate : windowStart;
  const logsStartUtc = getUtcRangeForDate(logsFromParts).startUtc;

  const logs = getUserLogsSince(user.id, logsStartUtc);
  const totalsByDate = bucketLogsByDay(logs, (loggedAt) =>
    dayKeyFromSqliteUtc(loggedAt, config.timezone)
  );

  const overrides = getDayOverrides(user.id, windowStartKey, todayKey);
  const dailyGoal = user.goal;
  const streak = computeStreak(
    dailyGoal,
    totalsByDate,
    todayParts,
    config.challengeStartDate,
    overrides
  );
  const last7Days = buildLast7Days(dailyGoal, totalsByDate, todayParts, overrides);

  return {
    total,
    todayTotal,
    dailyGoal,
    streak,
    last7Days,
    daysLeft: getDaysLeft(),
    todayParts,
    windowStartKey,
    todayKey,
  };
}
