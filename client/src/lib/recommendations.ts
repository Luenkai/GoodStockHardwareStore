import type { DemoCartItem } from "./cart";
import { productIsAvailable, type StoreProduct } from "./storefront";

function normalizeCategory(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

/**
 * Rank active catalog products from the shopper's current cart and recent
 * purchases. This is a transparent content-based scorer, not a trained model.
 */
export function recommendProducts(
  catalog: readonly StoreProduct[],
  cart: readonly DemoCartItem[],
  recentProductIds: readonly string[],
  limit = 4
): StoreProduct[] {
  if (limit <= 0) return [];

  const cartIds = new Set(cart.map(item => item.product.id));
  const recentIds = new Set(recentProductIds);
  const catalogById = new Map(catalog.map(product => [product.id, product]));
  const categoryWeights = new Map<string, number>();
  const addWeight = (category: string, weight: number) => {
    const key = normalizeCategory(category);
    if (key) categoryWeights.set(key, (categoryWeights.get(key) ?? 0) + weight);
  };

  for (const item of cart) {
    addWeight(
      item.product.productType,
      4 + Math.min(Math.max(item.quantity, 1), 4) * 0.25
    );
  }
  recentProductIds.forEach((id, index) => {
    const purchased = catalogById.get(id);
    if (purchased)
      addWeight(purchased.productType, Math.max(0.5, 2 - index * 0.15));
  });

  return catalog
    .filter(
      product =>
        productIsAvailable(product) &&
        !cartIds.has(product.id) &&
        !recentIds.has(product.id) &&
        categoryWeights.has(normalizeCategory(product.productType))
    )
    .map(product => ({
      product,
      score: categoryWeights.get(normalizeCategory(product.productType)) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.score - a.score || a.product.title.localeCompare(b.product.title)
    )
    .slice(0, limit)
    .map(result => result.product);
}
