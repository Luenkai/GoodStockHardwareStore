import { afterEach, describe, expect, it, vi } from "vitest";
import { listProductPage } from "./shopify";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Shopify product pagination", () => {
  it("passes an opaque cursor to Shopify and exposes the next page cursor", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "test-shop.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_ACCESS_TOKEN", "test-only-token");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        products: {
          nodes: [{
            id: "gid://shopify/Product/1",
            handle: "test-hammer",
            title: "Test Hammer",
            description: "",
            productType: "Hand Tools",
            vendor: "Test",
            tags: [],
            featuredImage: null,
            images: { nodes: [] },
            priceRange: { minVariantPrice: { amount: "100.00", currencyCode: "PHP" } },
            variants: { nodes: [] },
          }],
          pageInfo: { hasNextPage: true, endCursor: "next-page-cursor" },
        },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", request);

    const page = await listProductPage("opaque-current-cursor");

    expect(page.products).toHaveLength(1);
    expect(page.nextCursor).toBe("next-page-cursor");
    const requestBody = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(requestBody.variables).toEqual({ cursor: "opaque-current-cursor" });
    expect(requestBody.query).toContain("after: $cursor");
  });

  it("returns no next cursor when Shopify marks the last page", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "test-shop.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_ACCESS_TOKEN", "test-only-token");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { products: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", request);

    const page = await listProductPage("last-page-cursor");

    expect(page.products).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});
