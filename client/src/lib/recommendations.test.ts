import { describe, expect, it } from "vitest";
import type { DemoCartItem } from "./cart";
import { recommendProducts } from "./recommendations";
import type { StoreProduct } from "./storefront";

function product(
  id: string,
  title: string,
  productType: string,
  available = true
): StoreProduct {
  return {
    id,
    handle: id,
    title,
    description: "",
    productType,
    vendor: "Goodstock Hardware",
    tags: [],
    featuredImage: null,
    images: { nodes: [] },
    priceRange: { minVariantPrice: { amount: "10.00", currencyCode: "PHP" } },
    variants: {
      nodes: [
        {
          id: `${id}-variant`,
          title: "Default",
          sku: id,
          availableForSale: available,
          price: { amount: "10.00", currencyCode: "PHP" },
        },
      ],
    },
    source: "supabase",
  };
}

const screws = product("screws", "Project screws", "Fasteners");
const bolts = product("bolts", "Hex bolts", "Fasteners");
const pliers = product("pliers", "Combination pliers", "Tools");
const tape = product("tape", "Insulation tape", "Power & Electrical");
const tester = product("tester", "Voltage tester", "Power & Electrical");
const wrench = product("wrench", "Adjustable wrench", "Tools");
const unavailable = product(
  "out-of-stock",
  "Unavailable screws",
  "Fasteners",
  false
);
const catalog = [screws, bolts, pliers, tape, tester, wrench, unavailable];

function cartItem(item: StoreProduct): DemoCartItem {
  return { product: item, quantity: 1 };
}

describe("recommendProducts", () => {
  it("prioritizes cart categories over the shopper's recent purchase category", () => {
    const results = recommendProducts(
      catalog,
      [cartItem(screws)],
      [pliers.id],
      4
    );
    expect(results.map(item => item.id)).toEqual(["bolts", "wrench"]);
  });

  it("supports cart-only recommendations for signed-out shoppers", () => {
    const results = recommendProducts(catalog, [cartItem(tape)], [], 4);
    expect(results.map(item => item.id)).toEqual(["tester"]);
  });

  it("excludes cart and recent purchase products and unavailable products", () => {
    const results = recommendProducts(
      catalog,
      [cartItem(screws)],
      [wrench.id],
      4
    );
    expect(results.map(item => item.id)).toEqual(["bolts", "pliers"]);
  });

  it("returns no unpersonalized results and respects the requested result limit", () => {
    expect(recommendProducts(catalog, [], [], 4)).toEqual([]);
    expect(recommendProducts(catalog, [cartItem(screws)], [], 0)).toEqual([]);
    expect(recommendProducts(catalog, [cartItem(screws)], [], 1)).toHaveLength(
      1
    );
  });
});
