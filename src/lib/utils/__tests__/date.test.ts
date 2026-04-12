// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { getLogicalDate, getWeekStart, getWeekDates, generateTimeSlots } from "../date";

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
  it("returns Monday for a Wednesday", () => {
    expect(getWeekStart("2026-04-15")).toBe("2026-04-13");
  });

  it("returns same day for a Monday", () => {
    expect(getWeekStart("2026-04-13")).toBe("2026-04-13");
  });

  it("returns previous Monday for a Sunday", () => {
    expect(getWeekStart("2026-04-12")).toBe("2026-04-06");
  });
});

describe("getWeekDates", () => {
  it("returns 7 dates starting from Monday", () => {
    const dates = getWeekDates("2026-04-15");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-04-13");
    expect(dates[6]).toBe("2026-04-19");
  });
});

describe("generateTimeSlots", () => {
  it("generates 30-min slots from 04:00 to 06:00", () => {
    const slots = generateTimeSlots("04:00", "06:00", 30);
    expect(slots).toEqual(["04:00", "04:30", "05:00", "05:30"]);
  });

  it("handles midnight end time as 24:00", () => {
    const slots = generateTimeSlots("23:00", "00:00", 30);
    expect(slots).toEqual(["23:00", "23:30"]);
  });
});
