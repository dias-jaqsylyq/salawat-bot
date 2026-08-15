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
  parseDateKey,
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

  // A user becomes eligible on their own registration day, regardless of the
  // informational Mawlid start/end dates.
  const registrationKey = dayKeyFromSqliteUtc(user.created_at, config.timezone);
  const registrationParts = parseDateKey(registrationKey);
  const earliestEligibleKey = registrationKey;

  // Fetch enough history for the complete streak as well as the visible week.
  const logsFromKey =
    windowStartKey < registrationKey ? windowStartKey : registrationKey;
  const logsFromParts = parseDateKey(logsFromKey);
  const logsStartUtc = getUtcRangeForDate(logsFromParts).startUtc;

  const logs = getUserLogsSince(user.id, logsStartUtc);
  const totalsByDate = bucketLogsByDay(logs, (loggedAt) =>
    dayKeyFromSqliteUtc(loggedAt, config.timezone)
  );

  const overrides = getDayOverrides(user.id, registrationKey, todayKey);
  const dailyGoal = user.goal;
  const streak = computeStreak(
    dailyGoal,
    totalsByDate,
    todayParts,
    registrationParts,
    overrides
  );
  const last7Days = buildLast7Days(
    dailyGoal,
    totalsByDate,
    todayParts,
    registrationParts,
    overrides
  );

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
    earliestEligibleKey,
  };
}
