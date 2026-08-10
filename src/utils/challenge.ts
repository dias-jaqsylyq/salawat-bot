import { config } from "../config.js";
import type { DateParts } from "../types.js";

/** Returns today's calendar date (Y/M/D) as observed in the given IANA timezone. */
export function getTodayInTimezone(timeZone: string, now: Date = new Date()): DateParts {
  // en-CA locale formats as YYYY-MM-DD, which is convenient to split.
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

function toEpochDay(parts: DateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
}

/**
 * Days remaining until (and including) the challenge end date.
 * 0 means today is the last day; negative values are clamped to 0.
 */
export function getDaysLeft(now: Date = new Date()): number {
  const today = getTodayInTimezone(config.timezone, now);
  const daysLeft = toEpochDay(config.challengeEndDate) - toEpochDay(today);
  return Math.max(0, daysLeft);
}

/** True once today's date in TIMEZONE is on or after CHALLENGE_START_DATE. */
export function hasChallengeStarted(now: Date = new Date()): boolean {
  const today = getTodayInTimezone(config.timezone, now);
  return toEpochDay(today) >= toEpochDay(config.challengeStartDate);
}

export function hasChallengeEnded(now: Date = new Date()): boolean {
  const today = getTodayInTimezone(config.timezone, now);
  return toEpochDay(today) > toEpochDay(config.challengeEndDate);
}

/** Inclusive window: started and not yet past the end date. */
export function isChallengeActive(now: Date = new Date()): boolean {
  return hasChallengeStarted(now) && !hasChallengeEnded(now);
}

export function getPercentComplete(total: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.round((total / goal) * 1000) / 10; // one decimal place
}
