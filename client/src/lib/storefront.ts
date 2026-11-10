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
  source?: "shopify" | "local";
};

export type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    availableForSale: boolean;
    price: Money;
    product: {
      title: string;
      handle: string;
      featuredImage: StoreImage | null;
    };
  };
};

export type StoreCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: Money; totalAmount: Money };
  lines: { nodes: CartLine[] };
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
  const fastener = product.productType.toLowerCase().includes("fastener");
  return {
    url: fastener ? "/images/hillman-screws.jpg" : "/images/lm317-module.jpg",
    altText: fastener ? "Zinc-plated pan-head sheet-metal screw" : "LM317 adjustable voltage regulator module",
    width: null,
    height: null,
  };
}

export function productIsAvailable(product: Pick<StoreProduct, "variants">): boolean {
  return product.variants.nodes.some(variant => variant.availableForSale);
}
