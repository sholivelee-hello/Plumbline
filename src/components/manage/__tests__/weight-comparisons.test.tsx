import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightComparisons } from "@/components/manage/weight-comparisons";

describe("WeightComparisons", () => {
  it("renders positive diff in red", () => {
    const { container } = render(
      <WeightComparisons
        comparisons={{
          w1: { diffKg: 0.5, refDate: "2026-04-11" },
          m1: { diffKg: null, refDate: null, reason: "insufficient" },
          m3: { diffKg: null, refDate: null, reason: "insufficient" },
          y1: { diffKg: null, refDate: null, reason: "insufficient" },
        }}
      />
    );
    expect(screen.getByText(/\+0\.5 kg/)).toBeInTheDocument();
    expect(container.querySelector(".text-red-500, .text-red-400")).toBeTruthy();
  });

  it("renders negative diff in blue", () => {
    const { container } = render(
      <WeightComparisons
        comparisons={{
          w1: { diffKg: -0.5, refDate: "2026-04-11" },
          m1: { diffKg: null, refDate: null, reason: "insufficient" },
          m3: { diffKg: null, refDate: null, reason: "insufficient" },
          y1: { diffKg: null, refDate: null, reason: "insufficient" },
        }}
      />
    );
    expect(screen.getByText(/-0\.5 kg/)).toBeInTheDocument();
    expect(container.querySelector(".text-blue-600, .text-blue-400")).toBeTruthy();
  });

  it("renders '기록 부족' for insufficient comparisons", () => {
    render(
      <WeightComparisons
        comparisons={{
          w1: { diffKg: null, refDate: null, reason: "insufficient" },
          m1: { diffKg: null, refDate: null, reason: "insufficient" },
          m3: { diffKg: null, refDate: null, reason: "insufficient" },
          y1: { diffKg: null, refDate: null, reason: "insufficient" },
        }}
      />
    );
    expect(screen.getAllByText("기록 부족").length).toBe(4);
  });
});
