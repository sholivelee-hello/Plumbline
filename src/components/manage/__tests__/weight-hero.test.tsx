import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightHero } from "@/components/manage/weight-hero";
import type { Stats } from "@/lib/weight-utils";

const baseStats: Stats = {
  currentKg: 67.3,
  startKg: 73.5,
  lostKg: 6.2,
  remainKg: 5.3,
  daysLeft: 35,
  weeklyPace: 1.06,
  comparisons: {
    w1: { diffKg: null, refDate: null, reason: "insufficient" },
    m1: { diffKg: null, refDate: null, reason: "insufficient" },
    m3: { diffKg: null, refDate: null, reason: "insufficient" },
    y1: { diffKg: null, refDate: null, reason: "insufficient" },
  },
};

describe("WeightHero", () => {
  it("renders current weight", () => {
    render(<WeightHero stats={baseStats} goal={null} />);
    expect(screen.getByText("67.3 kg")).toBeInTheDocument();
  });
  it("shows achievement message when remainKg<=0", () => {
    render(
      <WeightHero
        stats={{ ...baseStats, remainKg: -1.0 }}
        goal={{ user_id: "u", target_kg: 68, deadline: "2026-05-23", updated_at: "" }}
      />
    );
    expect(screen.getByText(/목표 달성/)).toBeInTheDocument();
  });
  it("shows deadline-passed badge", () => {
    render(
      <WeightHero
        stats={{ ...baseStats, daysLeft: -3, weeklyPace: null }}
        goal={{ user_id: "u", target_kg: 62, deadline: "2026-04-01", updated_at: "" }}
      />
    );
    expect(screen.getByText(/데드라인 지남/)).toBeInTheDocument();
  });
  it("shows empty dash when no current weight", () => {
    render(
      <WeightHero
        stats={{ ...baseStats, currentKg: null, startKg: null, lostKg: null, remainKg: null }}
        goal={null}
      />
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
