import { describe, it, expect } from "vitest";
import {
  filterByRange,
  calcComparison,
  calcWeeklyPace,
  calcStats,
  type WeightEntryLite,
} from "@/lib/weight-utils";

const entries: WeightEntryLite[] = [
  { weighed_on: "2026-04-18", weight_kg: 67.3, created_at: "2026-04-18T08:00:00Z" },
  { weighed_on: "2026-04-11", weight_kg: 67.8, created_at: "2026-04-11T08:00:00Z" },
  { weighed_on: "2026-03-18", weight_kg: 69.1, created_at: "2026-03-18T08:00:00Z" },
  { weighed_on: "2026-01-18", weight_kg: 70.5, created_at: "2026-01-18T08:00:00Z" },
  { weighed_on: "2025-04-19", weight_kg: 73.5, created_at: "2025-04-19T08:00:00Z" },
];
const today = new Date("2026-04-18T12:00:00Z");

describe("filterByRange", () => {
  it("returns all when range=all", () => {
    expect(filterByRange(entries, "all", today)).toHaveLength(5);
  });
  it("returns last 1 month entries", () => {
    const out = filterByRange(entries, "1M", today);
    expect(out.map((e) => e.weighed_on)).toEqual(["2026-04-18", "2026-04-11", "2026-03-18"]);
  });
  it("returns empty on empty entries", () => {
    expect(filterByRange([], "3M", today)).toEqual([]);
  });
});

describe("calcComparison", () => {
  it("finds closest entry within tolerance for 7 days ago", () => {
    const r = calcComparison(entries, 7, 7, today);
    expect(r.refDate).toBe("2026-04-11");
    expect(r.diffKg).toBeCloseTo(-0.5, 1);
  });
  it("returns null when outside tolerance", () => {
    const sparse = [entries[0]]; // only today
    expect(calcComparison(sparse, 30, 14, today).diffKg).toBeNull();
  });
  it("returns null when entries empty", () => {
    expect(calcComparison([], 7, 7, today).diffKg).toBeNull();
  });
});

describe("calcWeeklyPace", () => {
  it("returns needed kg/week to reach goal", () => {
    // 현재 67.3, 목표 62.0, 데드라인 35일 뒤 = 5주
    const r = calcWeeklyPace(67.3, 62.0, "2026-05-23", today);
    expect(r).toBeCloseTo(1.06, 2); // (67.3-62)/5
  });
  it("returns null when deadline passed", () => {
    expect(calcWeeklyPace(67.3, 62.0, "2026-04-01", today)).toBeNull();
  });
  it("returns null when already achieved", () => {
    expect(calcWeeklyPace(61.0, 62.0, "2026-05-23", today)).toBeNull();
  });
});

describe("calcStats", () => {
  it("aggregates current/start/lost/remain", () => {
    const s = calcStats(entries, { target_kg: 62.0, deadline: "2026-05-23" } as any, today);
    expect(s.currentKg).toBe(67.3);
    expect(s.startKg).toBe(73.5);
    expect(s.lostKg).toBeCloseTo(6.2, 1);
    expect(s.remainKg).toBeCloseTo(5.3, 1);
  });
  it("returns null-ish when no entries", () => {
    const s = calcStats([], null, today);
    expect(s.currentKg).toBeNull();
    expect(s.startKg).toBeNull();
  });
});
