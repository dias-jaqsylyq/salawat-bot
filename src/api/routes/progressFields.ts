import { config } from "../../config.js";
import {
  getDayOverrides,
  getUserLogsSince,
  getUserTodayTotal,
  getUserTotal,
} from "../../db/repository.js";
import type { DateParts, User } from "../../types.js";
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

function maxDateParts(a: DateParts, b: DateParts): DateParts {
  const aEpoch = Date.UTC(a.year, a.month - 1, a.day);
  const bEpoch = Date.UTC(b.year, b.month - 1, b.day);
  return aEpoch >= bEpoch ? a : b;
}

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

  // Floor eligibility at the later of challenge start and the user's registration day.
  const registrationKey = dayKeyFromSqliteUtc(user.created_at, config.timezone);
  const registrationParts = parseDateKey(registrationKey);
  const earliestEligible = maxDateParts(config.challengeStartDate, registrationParts);
  const earliestEligibleKey = formatDateParts(earliestEligible);

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
    earliestEligible,
    overrides
  );
  const last7Days = buildLast7Days(
    dailyGoal,
    totalsByDate,
    todayParts,
    earliestEligible,
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
