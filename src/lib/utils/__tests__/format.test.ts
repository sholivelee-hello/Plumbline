// @vitest-environment node
import { describe, it, expect } from "vitest";
import { formatWon, calcPercent } from "../format";

describe("formatWon", () => {
  it("formats with commas", () => {
    expect(formatWon(1000000)).toBe("1,000,000");
  });

  it("formats zero", () => {
    expect(formatWon(0)).toBe("0");
  });
});

describe("calcPercent", () => {
  it("calculates percentage", () => {
    expect(calcPercent(3, 7)).toBe(43);
  });

  it("returns 0 when total is 0", () => {
    expect(calcPercent(5, 0)).toBe(0);
  });

  it("caps at 100", () => {
    expect(calcPercent(10, 5)).toBe(100);
  });
});
