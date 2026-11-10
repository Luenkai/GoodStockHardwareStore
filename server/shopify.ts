import { parse as parseCookie, serialize } from "cookie";
import type { Request, Response } from "express";
import { TRPCError } from "@trpc/server";

const API_VERSION = "2026-10";
const CART_COOKIE = "goodstock_cart_id";
const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

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
};

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  productType
  vendor
  tags
  featuredImage { url altText width height }
  images(first: 8) { nodes { url altText width height } }
  priceRange { minVariantPrice { amount currencyCode } }
  variants(first: 20) {
    nodes {
      id
      title
      sku
      availableForSale
      price { amount currencyCode }
    }
  }
`;

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  lines(first: 50) {
    nodes {
      id
      quantity
      merchandise {
        ... on ProductVariant {
          id
          title
          availableForSale
          price { amount currencyCode }
          product {
            title
            handle
            featuredImage { url altText width height }
          }
        }
      }
    }
  }
`;

type GraphQLResult<T> = { data?: T; errors?: Array<{ message?: string }> };

async function storefrontRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const configuredDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const domain = configuredDomain?.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
  if (!domain || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) || !accessToken) {
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Shopify storefront connection is not ready." });
  }

  let response: globalThis.Response;
  try {
    response = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The store could not be reached. Please try again." });
  }

  if (!response.ok) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The store is temporarily unavailable. Please try again." });
  }
  const payload = (await response.json()) as GraphQLResult<T>;
  if (payload.errors?.length || !payload.data) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The store could not complete that request. Please try again." });
  }
  return payload.data;
}

export async function listProducts(): Promise<StoreProduct[]> {
  const data = await storefrontRequest<{ products: { nodes: StoreProduct[] } }>(`
    query GoodstockHomeProducts {
      products(first: 8, sortKey: TITLE) { nodes { ${PRODUCT_FIELDS} } }
    }
  `);
  return data.products.nodes;
}

export async function listProductPage(cursor?: string | null): Promise<{ products: StoreProduct[]; nextCursor: string | null }> {
  const data = await storefrontRequest<{
    products: {
      nodes: StoreProduct[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(`
    query GoodstockCatalogPage($cursor: String) {
      products(first: 24, after: $cursor, sortKey: TITLE) {
        nodes { ${PRODUCT_FIELDS} }
        pageInfo { hasNextPage endCursor }
      }
    }
  `, { cursor: cursor ?? null });
  return {
    products: data.products.nodes,
    nextCursor: data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null,
  };
}

export async function getProductByHandle(handle: string): Promise<StoreProduct | null> {
  const data = await storefrontRequest<{ product: StoreProduct | null }>(`
    query GoodstockProduct($handle: String!) {
      product(handle: $handle) { ${PRODUCT_FIELDS} }
    }
  `, { handle });
  return data.product;
}

export async function getCustomerAccountUrl(): Promise<string> {
  const data = await storefrontRequest<{ shop: { primaryDomain: { url: string } } }>(`
    query GoodstockAccountLink { shop { primaryDomain { url } } }
  `);
  const origin = new URL(data.shop.primaryDomain.url);
  if (origin.protocol !== "https:" || !origin.hostname || origin.hostname === "localhost") {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Shopify customer accounts are not available yet." });
  }
  return new URL("/account", origin).toString();
}

function cartIdFromRequest(req: Request): string | null {
  const value = parseCookie(req.headers.cookie ?? "")[CART_COOKIE];
  return value && value.length < 512 ? value : null;
}

function appendCartCookie(res: Response, cartId: string): void {
  const base = serialize(CART_COOKIE, cartId, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: CART_MAX_AGE_SECONDS,
  });
  // Partition the embedded Preview cart where browsers support CHIPS.
  res.append("Set-Cookie", `${base}; Partitioned`);
}

function clearCartCookie(res: Response): void {
  const base = serialize(CART_COOKIE, "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 0,
  });
  res.append("Set-Cookie", `${base}; Partitioned`);
}

export async function getCart(req: Request, res: Response): Promise<unknown | null> {
  const cartId = cartIdFromRequest(req);
  if (!cartId) return null;
  const data = await storefrontRequest<{ cart: Record<string, unknown> | null }>(`
    query GoodstockCart($cartId: ID!) { cart(id: $cartId) { ${CART_FIELDS} } }
  `, { cartId });
  if (!data.cart) {
    clearCartCookie(res);
    return null;
  }
  return data.cart;
}

function throwCartErrors(errors: Array<{ message?: string }> | undefined): void {
  const message = errors?.map(error => error.message).filter(Boolean).join(" ");
  if (message) throw new TRPCError({ code: "BAD_REQUEST", message });
}

export async function addCartLine(req: Request, res: Response, merchandiseId: string, quantity: number): Promise<unknown> {
  const currentCartId = cartIdFromRequest(req);
  if (currentCartId) {
    const data = await storefrontRequest<{ cartLinesAdd: { cart: { id: string } | null; userErrors: Array<{ message?: string }> } }>(`
      mutation GoodstockAddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart { ${CART_FIELDS} }
          userErrors { message }
        }
      }
    `, { cartId: currentCartId, lines: [{ merchandiseId, quantity }] });
    throwCartErrors(data.cartLinesAdd.userErrors);
    if (!data.cartLinesAdd.cart) throw new TRPCError({ code: "BAD_GATEWAY", message: "The cart could not be updated." });
    appendCartCookie(res, data.cartLinesAdd.cart.id);
    return data.cartLinesAdd.cart;
  }

  const data = await storefrontRequest<{ cartCreate: { cart: { id: string } | null; userErrors: Array<{ message?: string }> } }>(`
    mutation GoodstockCreateCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart { ${CART_FIELDS} }
        userErrors { message }
      }
    }
  `, { input: { lines: [{ merchandiseId, quantity }] } });
  throwCartErrors(data.cartCreate.userErrors);
  if (!data.cartCreate.cart) throw new TRPCError({ code: "BAD_GATEWAY", message: "The cart could not be created." });
  appendCartCookie(res, data.cartCreate.cart.id);
  return data.cartCreate.cart;
}

export async function updateCartLine(req: Request, res: Response, lineId: string, quantity: number): Promise<unknown> {
  const cartId = cartIdFromRequest(req);
  if (!cartId) throw new TRPCError({ code: "NOT_FOUND", message: "Your cart is empty." });
  const data = await storefrontRequest<{ cartLinesUpdate: { cart: { id: string } | null; userErrors: Array<{ message?: string }> } }>(`
    mutation GoodstockUpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ${CART_FIELDS} }
        userErrors { message }
      }
    }
  `, { cartId, lines: [{ id: lineId, quantity }] });
  throwCartErrors(data.cartLinesUpdate.userErrors);
  if (!data.cartLinesUpdate.cart) throw new TRPCError({ code: "BAD_GATEWAY", message: "The cart could not be updated." });
  appendCartCookie(res, data.cartLinesUpdate.cart.id);
  return data.cartLinesUpdate.cart;
}

export async function removeCartLines(req: Request, res: Response, lineIds: string[]): Promise<unknown> {
  const cartId = cartIdFromRequest(req);
  if (!cartId) return null;
  const data = await storefrontRequest<{ cartLinesRemove: { cart: { id: string } | null; userErrors: Array<{ message?: string }> } }>(`
    mutation GoodstockRemoveCartLines($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${CART_FIELDS} }
        userErrors { message }
      }
    }
  `, { cartId, lineIds });
  throwCartErrors(data.cartLinesRemove.userErrors);
  const cart = data.cartLinesRemove.cart;
  if (cart) appendCartCookie(res, cart.id);
  else clearCartCookie(res);
  return cart;
}
