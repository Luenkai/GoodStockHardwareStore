import datasetCsv from "../../../data/demand-sales-1200.csv?raw";

export type TrainingRow = {
  date: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  promotion: number;
  seasonality: number;
  previous_month_demand: number;
  demand_units: number;
  sales_revenue: number;
};
type Point = { x: number[]; y: number };
type Tree = {
  value: number;
  feature?: number;
  threshold?: number;
  left?: Tree;
  right?: Tree;
};
export type LinearModel = {
  kind: "linear_regression";
  feature: number;
  slope: number;
  intercept: number;
};
export type ForestModel = {
  kind: "random_forest";
  trees: Tree[];
  featureCount: number;
};
export type DemandModel = LinearModel | ForestModel;
export type Evaluation = {
  mae: number;
  rmse: number;
  r2: number;
  trainRows: number;
  testRows: number;
};
export const metricDescriptions = {
  mae: "Mean Absolute Error: the average absolute difference between predicted and actual demand units. Lower is better.",
  rmse: "Root Mean Squared Error: an error metric that penalizes larger misses more strongly. Lower is better.",
  r2: "R²: the share of demand variation explained on held-out rows. Closer to 1 is better; a negative value indicates a poor fit.",
};
export const modelDescriptions = {
  linear_regression:
    "Simple Linear Regression uses previous-month demand as the single input feature and fits a straight-line relationship to next-month units.",
  random_forest:
    "Random Forest Regression averages 20 randomized decision trees trained on price, promotion, seasonality, and previous-month demand.",
};
export function parseDataset(csv = datasetCsv): TrainingRow[] {
  const lines = csv.trim().split(/\r?\n/);
  return lines
    .slice(1)
    .map(line => {
      const c = line.split(",");
      return {
        date: c[0]!,
        product_id: c[1]!,
        product_name: c[2]!,
        unit_price: Number(c[3]),
        promotion: Number(c[4]),
        seasonality: Number(c[5]),
        previous_month_demand: Number(c[6]),
        demand_units: Number(c[7]),
        sales_revenue: Number(c[8]),
      };
    })
    .filter(r =>
      [
        r.unit_price,
        r.promotion,
        r.seasonality,
        r.previous_month_demand,
        r.demand_units,
        r.sales_revenue,
      ].every(Number.isFinite)
    );
}
function points(rows: TrainingRow[]): Point[] {
  return rows.map(r => ({
    x: [r.unit_price, r.promotion, r.seasonality, r.previous_month_demand],
    y: r.demand_units,
  }));
}
function mean(rows: Point[]) {
  return rows.reduce((s, p) => s + p.y, 0) / Math.max(1, rows.length);
}
export function fitLinear(rows: Point[]): LinearModel {
  const feature = 3,
    mx = rows.reduce((s, p) => s + p.x[feature]!, 0) / rows.length,
    my = mean(rows),
    den = rows.reduce((s, p) => s + (p.x[feature]! - mx) ** 2, 0);
  const slope =
    den === 0
      ? 0
      : rows.reduce((s, p) => s + (p.x[feature]! - mx) * (p.y - my), 0) / den;
  return {
    kind: "linear_regression",
    feature,
    slope,
    intercept: my - slope * mx,
  };
}
function random(seed: number) {
  let n = seed >>> 0;
  return () => {
    n = (1664525 * n + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
function buildTree(rows: Point[], depth: number, rng: () => number): Tree {
  const value = mean(rows);
  if (depth === 0 || rows.length < 18 || rows.every(p => p.y === rows[0]!.y))
    return { value };
  const allFeatures = rows[0]!.x.length,
    count = Math.ceil(Math.sqrt(allFeatures)),
    selected = new Set<number>();
  while (selected.size < count) selected.add(Math.floor(rng() * allFeatures));
  let bestFeature = -1,
    bestThreshold = 0,
    bestLoss = Infinity;
  for (const feature of selected) {
    const values = [...new Set(rows.map(p => p.x[feature]!))].sort(
      (a, b) => a - b
    );
    if (values.length < 2) continue;
    const indices =
      values.length <= 17
        ? Array.from({ length: values.length - 1 }, (_, i) => i)
        : Array.from({ length: 16 }, (_, i) =>
            Math.floor((i * (values.length - 1)) / 16)
          );
    for (const i of indices) {
      const threshold = (values[i]! + values[i + 1]!) / 2,
        left = rows.filter(p => p.x[feature]! <= threshold),
        right = rows.filter(p => p.x[feature]! > threshold);
      if (left.length < 8 || right.length < 8) continue;
      const lm = mean(left),
        rm = mean(right),
        loss =
          left.reduce((s, p) => s + (p.y - lm) ** 2, 0) +
          right.reduce((s, p) => s + (p.y - rm) ** 2, 0);
      if (loss < bestLoss) {
        bestLoss = loss;
        bestFeature = feature;
        bestThreshold = threshold;
      }
    }
  }
  if (bestFeature < 0) return { value };
  const left = rows.filter(p => p.x[bestFeature]! <= bestThreshold),
    right = rows.filter(p => p.x[bestFeature]! > bestThreshold);
  return {
    value,
    feature: bestFeature,
    threshold: bestThreshold,
    left: buildTree(left, depth - 1, rng),
    right: buildTree(right, depth - 1, rng),
  };
}
export function fitForest(rows: Point[], treeCount = 20): ForestModel {
  const rng = random(22112026),
    trees: Tree[] = [];
  for (let t = 0; t < treeCount; t++) {
    const sample = Array.from(
      { length: rows.length },
      () => rows[Math.floor(rng() * rows.length)]!
    );
    trees.push(buildTree(sample, 5, rng));
  }
  return { kind: "random_forest", trees, featureCount: rows[0]?.x.length ?? 4 };
}
function treePrediction(node: Tree, x: number[]): number {
  if (node.feature === undefined || !node.left || !node.right)
    return node.value;
  return treePrediction(
    x[node.feature]! <= node.threshold! ? node.left : node.right,
    x
  );
}
export function predictDemand(model: DemandModel, input: number[]): number {
  if (model.kind === "linear_regression")
    return Math.max(0, model.intercept + model.slope * input[model.feature]!);
  return Math.max(
    0,
    model.trees.reduce((s, t) => s + treePrediction(t, input), 0) /
      Math.max(1, model.trees.length)
  );
}
export function score(model: DemandModel, rows: Point[]): Evaluation {
  const residuals = rows.map(p => p.y - predictDemand(model, p.x)),
    ybar = mean(rows),
    ssRes = residuals.reduce((s, e) => s + e * e, 0),
    ssTot = rows.reduce((s, p) => s + (p.y - ybar) ** 2, 0);
  return {
    mae:
      residuals.reduce((s, e) => s + Math.abs(e), 0) / Math.max(1, rows.length),
    rmse: Math.sqrt(ssRes / Math.max(1, rows.length)),
    r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot,
    trainRows: 0,
    testRows: rows.length,
  };
}
export function trainDemandModels() {
  const rows = parseDataset(),
    all = points(rows),
    split = Math.floor(all.length * 0.8),
    train = all.slice(0, split),
    test = all.slice(split),
    linear = fitLinear(train),
    forest = fitForest(train);
  return {
    datasetRows: rows,
    models: [
      {
        artifact: linear,
        metrics: { ...score(linear, test), trainRows: train.length },
      },
      {
        artifact: forest,
        metrics: { ...score(forest, test), trainRows: train.length },
      },
    ],
  };
}
export function datasetCsvSource() {
  return datasetCsv;
}
