import { describe, expect, it } from "vitest";
import { calculateMarkup, suggestedReplenishment } from "./business-pricing";

describe("business pricing helpers", () => {
  it("calculates markup amount and percentage from supplier cost", () => {
    expect(calculateMarkup(150, 100)).toEqual({ amount: 50, percentage: 50 });
  });

  it("keeps a loss visible and avoids division by zero", () => {
    expect(calculateMarkup(80, 100)).toEqual({ amount: -20, percentage: -20 });
    expect(calculateMarkup(25, 0)).toEqual({ amount: 25, percentage: null });
  });

  it("suggests stock only up to the configured maximum and never returns a negative quantity", () => {
    expect(suggestedReplenishment(100, 35)).toBe(65);
    expect(suggestedReplenishment(100, 120)).toBe(0);
    expect(suggestedReplenishment(0, 12)).toBe(0);
  });
});
