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

export function formatMoney(money?: Money | null): string {
  if (!money) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: money.currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(money.amount));
  } catch {
    return `${money.currencyCode} ${Number(money.amount).toFixed(2)}`;
  }
}

export function productImage(product: Pick<StoreProduct, "featuredImage" | "productType">): StoreImage {
  if (product.featuredImage?.url) return product.featuredImage;
  const type = product.productType.toLowerCase();
  const image = type.includes("fastener")
    ? { url: "/images/fasteners-illustration.svg", altText: "Generic fasteners illustration; not an exact product photo" }
    : type.includes("electrical")
      ? { url: "/images/electrical-illustration.svg", altText: "Generic electrical parts illustration; not an exact product photo" }
      : { url: "/images/tools-illustration.svg", altText: "Generic hand tools illustration; not an exact product photo" };
  return {
    url: image.url,
    altText: image.altText,
    width: null,
    height: null,
  };
}

export function productIsAvailable(product: Pick<StoreProduct, "variants">): boolean {
  return product.variants.nodes.some(variant => variant.availableForSale);
}
