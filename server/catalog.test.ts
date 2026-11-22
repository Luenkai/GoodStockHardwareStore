import { afterEach, describe, expect, it, vi } from "vitest";
import { listProductPage } from "./catalog";

const rows = Array.from({ length: 26 }, (_, index) => ({
  id: `product-${index + 1}`,
  handle: `product-${index + 1}`,
  title: `Demo Product ${index + 1}`,
  description: "",
  product_type: "Tools",
  vendor: "Goodstock Hardware",
  price: "100.00",
  currency_code: "PHP",
  inventory: 10,
  image_url: null,
  image_alt: null,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Supabase catalog pagination", () => {
  it("uses Supabase REST and returns the requested 24-product page", async () => {
    vi.stubEnv("SUPABASE_URL", "test-project-ref");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-only-key");
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", request);

    const page = await listProductPage("24");

    expect(request).toHaveBeenCalledOnce();
    expect(String(request.mock.calls[0]?.[0])).toBe("https://test-project-ref.supabase.co/rest/v1/products?select=*&is_active=eq.true&order=created_at.desc");
    expect(page.products).toHaveLength(12);
    expect(page.products[0]?.handle).toBe("product-25");
    expect(page.products.some(product => product.handle === "m12-stainless-steel-flat-washer-500-pack" && product.source === "local")).toBe(true);
    expect(page.nextCursor).toBeNull();
  });

  it("uses local preview data and does not call any remote store when Supabase is absent", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("SUPABASE_KEY", "");
    const request = vi.fn();
    vi.stubGlobal("fetch", request);

    const page = await listProductPage();

    expect(request).not.toHaveBeenCalled();
    expect(page.products.length).toBeGreaterThan(2);
    expect(page.products.every(product => product.source === "local")).toBe(true);
    expect(page.nextCursor).toBeNull();
  });
});
