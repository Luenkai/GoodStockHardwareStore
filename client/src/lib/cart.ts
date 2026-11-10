import { useSyncExternalStore } from "react";
import type { StoreProduct } from "./storefront";

export type DemoCartItem = {
  product: StoreProduct;
  quantity: number;
};

const STORAGE_KEY = "goodstock_demo_cart";
const EVENT_NAME = "goodstock-cart-updated";

function parseCart(raw: string): DemoCartItem[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readCart(): DemoCartItem[] {
  return parseCart(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
}

let cachedSnapshotRaw: string | null = null;
let cachedSnapshot: DemoCartItem[] = [];
const EMPTY_SERVER_CART: DemoCartItem[] = [];

function getCartSnapshot(): DemoCartItem[] {
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  if (raw !== cachedSnapshotRaw) {
    cachedSnapshotRaw = raw;
    cachedSnapshot = parseCart(raw);
  }
  return cachedSnapshot;
}

function writeCart(items: DemoCartItem[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function addToCart(product: StoreProduct, quantity = 1): void {
  const items = readCart();
  const existing = items.find(item => item.product.id === product.id);
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
  else items.push({ product, quantity: Math.min(99, Math.max(1, quantity)) });
  writeCart(items);
}

export function updateCartQuantity(productId: string, quantity: number): void {
  const items = readCart().map(item => item.product.id === productId ? { ...item, quantity: Math.min(99, Math.max(1, quantity)) } : item);
  writeCart(items);
}

export function removeFromCart(productId: string): void {
  writeCart(readCart().filter(item => item.product.id !== productId));
}

export function clearCart(): void {
  writeCart([]);
}

export function useDemoCart(): DemoCartItem[] {
  return useSyncExternalStore(
    callback => {
      window.addEventListener(EVENT_NAME, callback);
      window.addEventListener("storage", callback);
      return () => { window.removeEventListener(EVENT_NAME, callback); window.removeEventListener("storage", callback); };
    },
    getCartSnapshot,
    () => EMPTY_SERVER_CART,
  );
}
