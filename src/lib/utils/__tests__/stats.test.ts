// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  getActiveDays,
  calcAchievementRate,
  isNumericAchieved,
  getDailyAchievementRate,
  getMonthWeeks,
} from "../stats";

describe("getActiveDays", () => {
  it("returns intersection of item range and query range", () => {
    const days = getActiveDays("2026-04-05", null, "2026-04-01", "2026-04-10");
    expect(days).toBe(6);
  });
  it("handles deactivated items", () => {
    const days = getActiveDays("2026-04-03", "2026-04-07T12:00:00Z", "2026-04-01", "2026-04-10");
    expect(days).toBe(5);
  });
  it("returns 0 when item not yet created in range", () => {
    const days = getActiveDays("2026-04-15", null, "2026-04-01", "2026-04-10");
    expect(days).toBe(0);
  });
  it("returns 0 when item deactivated before range", () => {
    const days = getActiveDays("2026-04-01", "2026-04-03T00:00:00Z", "2026-04-05", "2026-04-10");
    expect(days).toBe(0);
  });
});

describe("isNumericAchieved", () => {
  it("returns true when value >= target", () => {
    expect(isNumericAchieved(30, 30)).toBe(true);
    expect(isNumericAchieved(35, 30)).toBe(true);
  });
  it("returns false when value < target", () => {
    expect(isNumericAchieved(25, 30)).toBe(false);
  });
  it("returns true when no target and value > 0", () => {
    expect(isNumericAchieved(5, null)).toBe(true);
  });
  it("returns false when no target and value is 0", () => {
    expect(isNumericAchieved(0, null)).toBe(false);
  });
  it("returns false when value is null", () => {
    expect(isNumericAchieved(null, 30)).toBe(false);
  });
});

describe("calcAchievementRate", () => {
  it("calculates percentage correctly", () => {
    expect(calcAchievementRate(3, 7)).toBeCloseTo(42.86, 1);
  });
  it("returns 0 when activeDays is 0", () => {
    expect(calcAchievementRate(0, 0)).toBe(0);
  });
  it("caps at 100", () => {
    expect(calcAchievementRate(10, 7)).toBe(100);
  });
});

describe("getDailyAchievementRate", () => {
  it("calculates rate from mixed logs", () => {
    const templates = [
      { id: "t1", type: "check" as const, target_value: null, created_at: "2026-04-01", deactivated_at: null },
      { id: "t2", type: "number" as const, target_value: 30, created_at: "2026-04-01", deactivated_at: null },
    ];
    const logs = [
      { template_id: "t1", completed: true, value: null },
      { template_id: "t2", completed: false, value: 35 },
    ];
    expect(getDailyAchievementRate(templates, logs)).toBe(100);
  });
  it("returns 0 when no templates", () => {
    expect(getDailyAchievementRate([], [])).toBe(0);
  });
});

describe("getMonthWeeks", () => {
  it("splits April 2026 into 4 weeks", () => {
    const weeks = getMonthWeeks("2026-04");
    expect(weeks).toEqual([
      { label: "1주차", start: 1, end: 7 },
      { label: "2주차", start: 8, end: 14 },
      { label: "3주차", start: 15, end: 21 },
      { label: "4주차", start: 22, end: 30 },
    ]);
  });
  it("handles February 2026 (28 days)", () => {
    const weeks = getMonthWeeks("2026-02");
    expect(weeks[3]).toEqual({ label: "4주차", start: 22, end: 28 });
  });
});
