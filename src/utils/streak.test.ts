import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLast7Days, computeStreak } from "./streak.js";
import type { DateParts } from "../types.js";

const today: DateParts = { year: 2026, month: 8, day: 11 };
const earliest: DateParts = { year: 2026, month: 8, day: 1 };

function totals(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

describe("computeStreak", () => {
  it("counts today + prior consecutive met days", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-08-09": 100,
        "2026-08-10": 150,
        "2026-08-11": 100,
      }),
      today,
      earliest
    );
    assert.equal(streak, 3);
  });

  it("skips unmet today and counts from yesterday (day in progress)", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-08-09": 100,
        "2026-08-10": 100,
        "2026-08-11": 45,
      }),
      today,
      earliest
    );
    assert.equal(streak, 2);
  });

  it("resets when yesterday was missed even if today is met", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-08-10": 40,
        "2026-08-11": 120,
      }),
      today,
      earliest
    );
    assert.equal(streak, 1);
  });

  it("is 0 when today unmet and yesterday missed", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-08-10": 0,
        "2026-08-11": 50,
      }),
      today,
      earliest
    );
    assert.equal(streak, 0);
  });

  it("treats empty days as misses (no grace period)", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-08-08": 100,
        // 2026-08-09 missing
        "2026-08-10": 100,
        "2026-08-11": 100,
      }),
      today,
      earliest
    );
    assert.equal(streak, 2);
  });

  it("does not extend before challenge start", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-07-31": 999,
        "2026-08-01": 100,
        "2026-08-02": 100,
      }),
      { year: 2026, month: 8, day: 2 },
      { year: 2026, month: 8, day: 1 }
    );
    assert.equal(streak, 2);
  });
});

describe("buildLast7Days", () => {
  it("returns 7 days oldest→newest ending today", () => {
    const days = buildLast7Days(
      100,
      totals({
        "2026-08-05": 120,
        "2026-08-06": 40,
        "2026-08-11": 45,
      }),
      today
    );
    assert.equal(days.length, 7);
    assert.equal(days[0]!.date, "2026-08-05");
    assert.equal(days[6]!.date, "2026-08-11");
    assert.deepEqual(days[0], { date: "2026-08-05", total: 120, metGoal: true });
    assert.deepEqual(days[1], { date: "2026-08-06", total: 40, metGoal: false });
    assert.deepEqual(days[2], { date: "2026-08-07", total: 0, metGoal: false });
    assert.deepEqual(days[6], { date: "2026-08-11", total: 45, metGoal: false });
  });
});
