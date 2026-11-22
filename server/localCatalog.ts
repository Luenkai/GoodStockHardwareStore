import type { StoreProduct } from "./catalog";
import seed from "../data/hardware-seed.json";
import expansion from "../data/qte-catalog-expansion.json";

type SeedProduct = {
  handle?: string;
  title: string;
  descriptionHtml: string;
  productType: string;
  vendor: string;
  category: string;
  demoPrice: string;
  currency: string;
  imageFile: string;
  imageAlt: string;
};

const seedProducts = [...seed.products, ...expansion.products] as SeedProduct[];

function stripHtml(value: string): string {
  return value
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<li\s*>/gi, "\n• ")
    .replace(/<\/li\s*>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&times;/gi, "×")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split("\n")
    .map(line => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function imagePath(seedProduct: SeedProduct): string {
  return `/${seedProduct.imageFile.replace(/^client\/public\//, "")}`;
}

export const localCatalog: StoreProduct[] = seedProducts.map((product, index) => ({
  id: `gid://goodstock/local-product/${index + 1}`,
  handle: product.handle ?? `local-${index + 1}-${product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  title: product.title,
  description: stripHtml(product.descriptionHtml),
  productType: product.productType,
  vendor: product.vendor,
  tags: [product.category, "starter catalog"],
  featuredImage: {
    url: imagePath(product),
    altText: product.imageAlt,
    width: null,
    height: null,
  },
  images: {
    nodes: [{
      url: imagePath(product),
      altText: product.imageAlt,
      width: null,
      height: null,
    }],
  },
  priceRange: { minVariantPrice: { amount: product.demoPrice, currencyCode: product.currency } },
  variants: {
    nodes: [{
      id: `gid://goodstock/local-variant/${index + 1}`,
      title: "Starter listing",
      sku: null,
      availableForSale: false,
      price: { amount: product.demoPrice, currencyCode: product.currency },
    }],
  },
  source: "local",
}));

export const localExpansionCatalog = localCatalog.filter(product => !product.handle.startsWith("local-"));

export function localProductByHandle(handle: string): StoreProduct | null {
  return localCatalog.find(product => product.handle === handle) ?? null;
}
