import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLast7Days, computeStreak, effectiveMet } from "./streak.js";
import type { DateParts } from "../types.js";

const today: DateParts = { year: 2026, month: 8, day: 11 };
const earliest: DateParts = { year: 2026, month: 8, day: 1 };

function totals(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

function overrides(entries: Record<string, boolean>): Map<string, boolean> {
  return new Map(Object.entries(entries));
}

describe("effectiveMet", () => {
  it("uses override when present", () => {
    assert.equal(effectiveMet("2026-08-10", 0, 100, overrides({ "2026-08-10": true })), true);
    assert.equal(effectiveMet("2026-08-10", 200, 100, overrides({ "2026-08-10": false })), false);
  });

  it("falls back to total >= goal when no override", () => {
    assert.equal(effectiveMet("2026-08-10", 100, 100), true);
    assert.equal(effectiveMet("2026-08-10", 40, 100), false);
  });
});

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

  it("treats empty days as misses unless overridden", () => {
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

  it("override met on zero-total past day counts toward streak only for that day", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-08-09": 0,
        "2026-08-10": 0,
        "2026-08-11": 100,
      }),
      today,
      earliest,
      overrides({ "2026-08-10": true })
    );
    // today met + override-met yesterday; Aug 9 still missed → streak 2
    assert.equal(streak, 2);
  });

  it("override missed on logged-met past day breaks streak there only", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-08-09": 100,
        "2026-08-10": 150,
        "2026-08-11": 100,
      }),
      today,
      earliest,
      overrides({ "2026-08-10": false })
    );
    // today met; yesterday force-missed → streak 1
    assert.equal(streak, 1);
  });

  it("mix of real-met, override-met, and missed recalculates correctly", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-08-07": 100, // real met
        "2026-08-08": 0, // override met
        "2026-08-09": 0, // missed
        "2026-08-10": 0, // override met
        "2026-08-11": 50, // today unmet → start at yesterday
      }),
      today,
      earliest,
      overrides({ "2026-08-08": true, "2026-08-10": true })
    );
    // walk: 10 met, 9 miss → streak 1
    assert.equal(streak, 1);
  });

  it("ignores override on today (today locked to logs)", () => {
    const streak = computeStreak(
      100,
      totals({
        "2026-08-10": 100,
        "2026-08-11": 10,
      }),
      today,
      earliest,
      overrides({ "2026-08-11": true })
    );
    // today still unmet via logs → start yesterday → streak 1
    assert.equal(streak, 1);
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

  it("keeps log totals while metGoal follows override; neighbors unchanged", () => {
    const days = buildLast7Days(
      100,
      totals({
        "2026-08-09": 0,
        "2026-08-10": 200,
        "2026-08-11": 45,
      }),
      today,
      overrides({ "2026-08-09": true, "2026-08-10": false })
    );
    assert.deepEqual(days[4], { date: "2026-08-09", total: 0, metGoal: true });
    assert.deepEqual(days[5], { date: "2026-08-10", total: 200, metGoal: false });
    assert.deepEqual(days[6], { date: "2026-08-11", total: 45, metGoal: false });
  });

  it("does not apply override to today", () => {
    const days = buildLast7Days(
      100,
      totals({ "2026-08-11": 10 }),
      today,
      overrides({ "2026-08-11": true })
    );
    assert.deepEqual(days[6], { date: "2026-08-11", total: 10, metGoal: false });
  });
});
