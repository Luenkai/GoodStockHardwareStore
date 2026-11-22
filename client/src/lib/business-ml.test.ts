import { describe, expect, it } from "vitest";
import {
  parseDataset,
  predictDemand,
  score,
  trainDemandModels,
} from "./business-ml";

describe("Goodstock demand models", () => {
  it("loads the complete 1,200-record CSV dataset with valid numeric values", () => {
    const rows = parseDataset();
    expect(rows).toHaveLength(1200);
    expect(
      rows.every(
        row => Number.isFinite(row.demand_units) && row.demand_units > 0
      )
    ).toBe(true);
  });

  it("trains both persisted-model-compatible regressors and evaluates a chronological holdout", () => {
    const trained = trainDemandModels();
    expect(trained.models.map(model => model.artifact.kind)).toEqual([
      "linear_regression",
      "random_forest",
    ]);
    for (const model of trained.models) {
      expect(model.metrics.trainRows).toBe(960);
      expect(model.metrics.testRows).toBe(240);
      expect(Number.isFinite(model.metrics.mae)).toBe(true);
      expect(Number.isFinite(model.metrics.rmse)).toBe(true);
      expect(Number.isFinite(model.metrics.r2)).toBe(true);
      expect(
        predictDemand(model.artifact, [50, 0, 1, 55])
      ).toBeGreaterThanOrEqual(0);
    }
    expect(trained.models[1]!.metrics.rmse).toBeLessThan(
      trained.models[0]!.metrics.rmse
    );
  });

  it("keeps forest fitting deterministic when evaluated on the same holdout", () => {
    const first = trainDemandModels().models[1]!;
    const second = trainDemandModels().models[1]!;
    expect(first.metrics).toEqual(second.metrics);
    expect(
      score(
        first.artifact,
        parseDataset()
          .slice(-10)
          .map(row => ({
            x: [
              row.unit_price,
              row.promotion,
              row.seasonality,
              row.previous_month_demand,
            ],
            y: row.demand_units,
          }))
      )
    ).toEqual(
      score(
        second.artifact,
        parseDataset()
          .slice(-10)
          .map(row => ({
            x: [
              row.unit_price,
              row.promotion,
              row.seasonality,
              row.previous_month_demand,
            ],
            y: row.demand_units,
          }))
      )
    );
  });
});
