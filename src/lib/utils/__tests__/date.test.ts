// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { getLogicalDate, getWeekStart, getWeekDates } from "../date";

describe("getLogicalDate", () => {
  it("returns today's calendar date in the morning", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T10:00:00"));
    expect(getLogicalDate()).toBe("2026-04-12");
    vi.useRealTimers();
  });

  it("returns today's calendar date past midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T02:00:00"));
    expect(getLogicalDate()).toBe("2026-04-12");
    vi.useRealTimers();
  });

  it("rolls over exactly at midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T00:00:00"));
    expect(getLogicalDate()).toBe("2026-04-12");
    vi.useRealTimers();
  });
});

describe("getWeekStart", () => {
  it("returns Sunday for a Wednesday", () => {
    expect(getWeekStart("2026-04-15")).toBe("2026-04-12");
  });

  it("returns previous Sunday for a Monday", () => {
    expect(getWeekStart("2026-04-13")).toBe("2026-04-12");
  });

  it("returns same day for a Sunday", () => {
    expect(getWeekStart("2026-04-12")).toBe("2026-04-12");
  });

  it("returns Sunday for a Saturday", () => {
    expect(getWeekStart("2026-04-18")).toBe("2026-04-12");
  });
});

describe("getWeekDates", () => {
  it("returns 7 dates starting from Sunday", () => {
    const dates = getWeekDates("2026-04-15");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-04-12");
    expect(dates[6]).toBe("2026-04-18");
  });
});

