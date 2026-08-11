import type { DateParts } from "../types.js";
import {
  addOneCalendarDay,
  formatDateParts,
  subtractOneCalendarDay,
} from "./dates.js";

export interface DayBreakdown {
  date: string;
  total: number;
  metGoal: boolean;
}

/**
 * Consecutive met days walking backward from today.
 * - Today counts only if todayTotal >= dailyGoal.
 * - If today is unmet, walking starts at yesterday (today still in progress).
 * - A past day with total < dailyGoal stops the streak (no grace period).
 * - Days before `earliestParts` (challenge start) are ignored / stop the walk.
 */
export function computeStreak(
  dailyGoal: number,
  totalsByDate: Map<string, number>,
  todayParts: DateParts,
  earliestParts?: DateParts
): number {
  if (dailyGoal <= 0) return 0;

  let day = todayParts;
  const todayTotal = totalsByDate.get(formatDateParts(day)) ?? 0;
  if (todayTotal < dailyGoal) {
    day = subtractOneCalendarDay(day);
  }

  let streak = 0;
  while (true) {
    if (earliestParts) {
      const dayEpoch = Date.UTC(day.year, day.month - 1, day.day);
      const earliestEpoch = Date.UTC(
        earliestParts.year,
        earliestParts.month - 1,
        earliestParts.day
      );
      if (dayEpoch < earliestEpoch) break;
    }

    const total = totalsByDate.get(formatDateParts(day)) ?? 0;
    if (total < dailyGoal) break;
    streak += 1;
    day = subtractOneCalendarDay(day);
  }
  return streak;
}

/** Exactly 7 days ending with today, oldest → newest. */
export function buildLast7Days(
  dailyGoal: number,
  totalsByDate: Map<string, number>,
  todayParts: DateParts
): DayBreakdown[] {
  let day = todayParts;
  for (let i = 0; i < 6; i++) {
    day = subtractOneCalendarDay(day);
  }

  const days: DayBreakdown[] = [];
  for (let i = 0; i < 7; i++) {
    const date = formatDateParts(day);
    const total = totalsByDate.get(date) ?? 0;
    days.push({ date, total, metGoal: total >= dailyGoal });
    day = addOneCalendarDay(day);
  }
  return days;
}

/** Aggregate log rows into TIMEZONE day totals. */
export function bucketLogsByDay(
  rows: { logged_at: string; count: number }[],
  dayKeyFn: (loggedAt: string) => string
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = dayKeyFn(row.logged_at);
    totals.set(key, (totals.get(key) ?? 0) + row.count);
  }
  return totals;
}
