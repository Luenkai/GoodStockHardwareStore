import { TRPCError } from "@trpc/server";
import { localCatalog, localExpansionCatalog, localProductByHandle } from "./localCatalog";

export type Money = { amount: string; currencyCode: string };
export type StoreImage = { url: string; altText: string | null; width: number | null; height: number | null };
export type StoreVariant = {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  price: Money;
};
export type StoreProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  featuredImage: StoreImage | null;
  images: { nodes: StoreImage[] };
  priceRange: { minVariantPrice: Money };
  variants: { nodes: StoreVariant[] };
  source?: "supabase" | "local";
};

type ProductRow = Record<string, unknown>;

function supabaseConfig(): { url: string; key: string } {
  const configuredUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const url = configuredUrl.trim().replace(/\/$/, "");
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : url ? `https://${url}.supabase.co` : "";
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || (process.env.SUPABASE_KEY?.startsWith("sb_publishable_") ? process.env.SUPABASE_KEY : "");
  return { url: normalizedUrl, key };
}

function hasSupabaseConfig(): boolean {
  const { url, key } = supabaseConfig();
  return Boolean(url && key);
}

function mapSupabaseProduct(row: ProductRow): StoreProduct {
  const inventory = Number(row.inventory ?? 0);
  const price = String(row.price ?? "0");
  const currencyCode = String(row.currency_code ?? "PHP");
  const image = row.image_url
    ? { url: String(row.image_url), altText: row.image_alt ? String(row.image_alt) : null, width: null, height: null }
    : null;
  return {
    id: String(row.id),
    handle: String(row.handle),
    title: String(row.title),
    description: String(row.description ?? ""),
    productType: String(row.product_type ?? "Hardware"),
    vendor: String(row.vendor ?? "Goodstock Hardware"),
    tags: [],
    featuredImage: image,
    images: { nodes: image ? [image] : [] },
    priceRange: { minVariantPrice: { amount: price, currencyCode } },
    variants: {
      nodes: [{
        id: `supabase:${String(row.id)}`,
        title: "Standard",
        sku: null,
        availableForSale: inventory > 0,
        price: { amount: price, currencyCode },
      }],
    },
    source: "supabase",
  };
}

async function supabaseProducts(): Promise<StoreProduct[]> {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/products?select=*&is_active=eq.true&order=created_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: "The Supabase catalog could not be loaded." });
  const rows = await response.json() as ProductRow[];
  return rows.map(mapSupabaseProduct);
}

async function catalogProducts(): Promise<StoreProduct[]> {
  if (!hasSupabaseConfig()) return localCatalog;
  const products = await supabaseProducts();
  const liveHandles = new Set(products.map(product => product.handle));
  // Keep missing seed records visible as non-purchasable previews until an authorized database import is applied.
  return [...products, ...localExpansionCatalog.filter(product => !liveHandles.has(product.handle))];
}

export async function listProducts(): Promise<StoreProduct[]> {
  return catalogProducts();
}

export async function listProductPage(cursor?: string | null): Promise<{ products: StoreProduct[]; nextCursor: string | null }> {
  const products = await catalogProducts();
  const parsedStart = cursor ? Number(cursor) : 0;
  const start = Number.isInteger(parsedStart) && parsedStart >= 0 ? parsedStart : 0;
  const page = products.slice(start, start + 24);
  const nextIndex = start + page.length;
  return { products: page, nextCursor: nextIndex < products.length ? String(nextIndex) : null };
}

export async function getProductByHandle(handle: string): Promise<StoreProduct | null> {
  if (!hasSupabaseConfig()) return localProductByHandle(handle);
  return (await catalogProducts()).find(product => product.handle === handle) ?? localProductByHandle(handle);
}
