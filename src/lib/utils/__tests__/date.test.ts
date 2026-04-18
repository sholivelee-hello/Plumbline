// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { getLogicalDate, getWeekStart, getWeekDates } from "../date";

describe("getLogicalDate", () => {
  it("returns today when after day start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T10:00:00"));
    expect(getLogicalDate("04:00")).toBe("2026-04-12");
    vi.useRealTimers();
  });

  it("returns yesterday when before day start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T03:00:00"));
    expect(getLogicalDate("04:00")).toBe("2026-04-11");
    vi.useRealTimers();
  });

  it("returns today at exactly day start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T04:00:00"));
    expect(getLogicalDate("04:00")).toBe("2026-04-12");
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

