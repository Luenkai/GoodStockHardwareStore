import type { StoreProduct } from "./shopify";
import seed from "../data/hardware-seed.json";

type SeedProduct = (typeof seed.products)[number];

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function imagePath(seedProduct: SeedProduct): string {
  return `/${seedProduct.imageFile.replace(/^client\/public\//, "")}`;
}

export const localCatalog: StoreProduct[] = seed.products.map((product, index) => ({
  id: `gid://goodstock/local-product/${index + 1}`,
  handle: `local-${index + 1}-${product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
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

export function localProductByHandle(handle: string): StoreProduct | null {
  return localCatalog.find(product => product.handle === handle) ?? null;
}
