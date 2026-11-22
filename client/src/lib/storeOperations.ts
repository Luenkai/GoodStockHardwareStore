import type { User } from "@supabase/supabase-js";
import {
  EMPTY_CUSTOMER_ADDRESS,
  normalizeAddressForSave,
  type CustomerAddressDraft,
} from "./accountValidation";
import { productImage, type StoreProduct } from "./storefront";
import { supabase } from "./supabase";

export type CustomerUser = {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  raw?: User;
};

export type OrderItemRecord = {
  id: string;
  product_id: string | null;
  title: string;
  quantity: number;
  unit_price: string;
  image_url?: string | null;
};

export type ShippingDetails = {
  recipient_name: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postal_code: string;
  country: string;
  fulfillment_method: "delivery" | "pickup";
  payment_method: "cod" | "ewallet" | "card";
  shipping_fee: string;
};

export type OrderRecord = {
  id: string;
  status: string;
  total: string;
  currency_code: string;
  created_at: string;
  shipping_address?: ShippingDetails | null;
  order_items: OrderItemRecord[];
};

type LocalRegisteredAccount = {
  id: string;
  email: string;
  password: string;
  displayName: string;
  phone: string;
  role: "admin" | "sales_personnel" | "inventory_clerk" | "instructor";
  createdAt: string;
};

type LocalCustomerData = {
  profiles: Record<string, { display_name: string; phone: string }>;
  addresses: Record<string, CustomerAddressDraft>;
  orders: (OrderRecord & { user_id: string; customer_email: string })[];
};

const ACCOUNTS_KEY = "goodstock_accounts_v1";
const SESSION_KEY = "goodstock_active_session_v1";
const CUSTOMER_DATA_KEY = "goodstock_customer_data_v1";
export const AUTH_STATE_EVENT = "goodstock-auth-changed";
export const STORE_DATA_EVENT = "goodstock-store-data-changed";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const memoryStore = new Map<string, string>();

function readStorage(key: string): string | null {
  try {
    if (typeof window !== "undefined") {
      const val = window.localStorage.getItem(key);
      if (val !== null) {
        memoryStore.set(key, val);
        return val;
      }
    }
  } catch {
    // Fall back to in-memory storage if blocked.
  }
  return memoryStore.get(key) ?? null;
}

function writeStorage(key: string, value: string | null): void {
  if (value === null) {
    memoryStore.delete(key);
  } else {
    memoryStore.set(key, value);
  }
  try {
    if (typeof window !== "undefined") {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    }
  } catch {
    // Keep state in memory when localStorage throws.
  }
}

function emitEvent(name: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(name));
  }
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_ACCOUNTS: LocalRegisteredAccount[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "admin@goodstock.ph",
    password: "password123",
    displayName: "Alex Morgan",
    phone: "+63 917 555 0142",
    role: "admin",
    createdAt: "2026-11-01T08:00:00.000Z",
  },
];

function readLocalAccounts(): LocalRegisteredAccount[] {
  const raw = readStorage(ACCOUNTS_KEY);
  if (!raw) {
    writeStorage(ACCOUNTS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
    return [...DEFAULT_ACCOUNTS];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as LocalRegisteredAccount[];
    }
  } catch {
    // Reset corrupted JSON.
  }
  writeStorage(ACCOUNTS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
  return [...DEFAULT_ACCOUNTS];
}

function writeLocalAccounts(accounts: LocalRegisteredAccount[]): void {
  writeStorage(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function readLocalCustomerData(): LocalCustomerData {
  const raw = readStorage(CUSTOMER_DATA_KEY);
  if (!raw) {
    return { profiles: {}, addresses: {}, orders: [] };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LocalCustomerData>;
    return {
      profiles: parsed.profiles ?? {},
      addresses: parsed.addresses ?? {},
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return { profiles: {}, addresses: {}, orders: [] };
  }
}

function writeLocalCustomerData(data: LocalCustomerData): void {
  writeStorage(CUSTOMER_DATA_KEY, JSON.stringify(data));
  emitEvent(STORE_DATA_EVENT);
}

export function mapSupabaseUser(user: User | null): CustomerUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const displayName = String(
    meta.display_name ||
      meta.full_name ||
      user.email?.split("@")[0] ||
      "Customer",
  );
  return {
    id: user.id,
    email: user.email || "",
    displayName,
    phone: String(meta.phone || ""),
    raw: user,
  };
}

function toCustomerUserFromLocal(
  account: LocalRegisteredAccount,
): CustomerUser {
  const data = readLocalCustomerData();
  const profile = data.profiles[account.id];
  return {
    id: account.id,
    email: account.email,
    displayName: profile?.display_name ?? account.displayName,
    phone: profile?.phone ?? account.phone,
  };
}

export function getLocalSessionUser(): CustomerUser | null {
  const userId = readStorage(SESSION_KEY);
  if (!userId) return null;
  const account = readLocalAccounts().find(acc => acc.id === userId);
  return account ? toCustomerUserFromLocal(account) : null;
}

export async function resolveCurrentUser(): Promise<CustomerUser | null> {
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    return mapSupabaseUser(data.user);
  }
  return getLocalSessionUser();
}

export async function signInCustomer(
  email: string,
  password: string,
): Promise<{ user?: CustomerUser; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error || !data.user) {
      return {
        error: error?.message || "Invalid email or password. Please try again.",
      };
    }
    return { user: mapSupabaseUser(data.user) ?? undefined };
  }

  const accounts = readLocalAccounts();
  const matched = accounts.find(
    acc => acc.email.toLowerCase() === normalizedEmail,
  );
  if (!matched || matched.password !== password) {
    return {
      error: "Incorrect email or password. Check your credentials or create an account.",
    };
  }
  writeStorage(SESSION_KEY, matched.id);
  emitEvent(AUTH_STATE_EVENT);
  return { user: toCustomerUserFromLocal(matched) };
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<{
  user?: CustomerUser;
  requiresEmailConfirmation?: boolean;
  error?: string;
}> {
  const trimmedName = input.name.trim();
  const normalizedEmail = input.email.trim().toLowerCase();
  const trimmedPhone = (input.phone ?? "").trim();

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: input.password,
      options: {
        data: {
          display_name: trimmedName,
          phone: trimmedPhone,
        },
      },
    });
    if (error) {
      return { error: error.message };
    }
    if (data.session && data.user) {
      if (trimmedPhone) {
        await supabase
          .from("profiles")
          .update({ display_name: trimmedName, phone: trimmedPhone })
          .eq("id", data.user.id);
      }
      return { user: mapSupabaseUser(data.user) ?? undefined };
    }
    return { requiresEmailConfirmation: true };
  }

  const accounts = readLocalAccounts();
  if (accounts.some(acc => acc.email.toLowerCase() === normalizedEmail)) {
    return {
      error: "An account with this email already exists. Sign in instead.",
    };
  }

  const created: LocalRegisteredAccount = {
    id: makeId("usr"),
    email: normalizedEmail,
    password: input.password,
    displayName: trimmedName,
    phone: trimmedPhone,
    role: "admin",
    createdAt: new Date().toISOString(),
  };
  accounts.push(created);
  writeLocalAccounts(accounts);

  const customerData = readLocalCustomerData();
  customerData.profiles[created.id] = {
    display_name: trimmedName,
    phone: trimmedPhone,
  };
  writeLocalCustomerData(customerData);

  writeStorage(SESSION_KEY, created.id);
  emitEvent(AUTH_STATE_EVENT);
  return { user: toCustomerUserFromLocal(created) };
}

export async function signOutCustomer(): Promise<{ error?: string }> {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    return {};
  }
  writeStorage(SESSION_KEY, null);
  emitEvent(AUTH_STATE_EVENT);
  return {};
}

export async function loadCustomerProfileData(user: CustomerUser): Promise<{
  name: string;
  phone: string;
  address: CustomerAddressDraft;
}> {
  if (supabase) {
    const [profileRes, addrRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name,phone")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("addresses")
        .select(
          "id,recipient_name,label,line1,line2,city,region,postal_code,country",
        )
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      name: profileRes.data?.display_name ?? user.displayName,
      phone: profileRes.data?.phone ?? user.phone ?? "",
      address: addrRes.data
        ? {
            id: addrRes.data.id,
            recipient_name: addrRes.data.recipient_name || "",
            label: addrRes.data.label || "Home",
            line1: addrRes.data.line1 || "",
            line2: addrRes.data.line2 || "",
            city: addrRes.data.city || "",
            region: addrRes.data.region || "",
            postal_code: addrRes.data.postal_code || "",
            country: addrRes.data.country || "PH",
          }
        : EMPTY_CUSTOMER_ADDRESS,
    };
  }

  const data = readLocalCustomerData();
  const profile = data.profiles[user.id];
  const savedAddress = data.addresses[user.id];
  return {
    name: profile?.display_name ?? user.displayName,
    phone: profile?.phone ?? user.phone ?? "",
    address: savedAddress ? { ...savedAddress } : EMPTY_CUSTOMER_ADDRESS,
  };
}

export async function saveLocalProfileAndAddress(
  userId: string,
  name: string,
  phone: string,
  address: CustomerAddressDraft | null,
): Promise<CustomerAddressDraft> {
  const data = readLocalCustomerData();
  data.profiles[userId] = { display_name: name, phone };

  const accounts = readLocalAccounts();
  const idx = accounts.findIndex(acc => acc.id === userId);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx]!, displayName: name, phone };
    writeLocalAccounts(accounts);
  }

  let savedAddr: CustomerAddressDraft = EMPTY_CUSTOMER_ADDRESS;
  if (address) {
    const normalized = normalizeAddressForSave(address, userId, name);
    savedAddr = {
      id: address.id ?? makeId("addr"),
      recipient_name: normalized.recipient_name,
      label: normalized.label,
      line1: normalized.line1,
      line2: normalized.line2,
      city: normalized.city,
      region: normalized.region,
      postal_code: normalized.postal_code,
      country: normalized.country,
    };
    data.addresses[userId] = savedAddr;
  }
  writeLocalCustomerData(data);
  emitEvent(AUTH_STATE_EVENT);
  return savedAddr;
}

export async function fetchCustomerOrders(
  userId: string,
): Promise<{ orders: OrderRecord[]; error?: string }> {
  if (supabase) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,status,total,currency_code,shipping_address,created_at,order_items(id,product_id,title,quantity,unit_price,image_url)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      return { orders: [], error: error.message };
    }
    return { orders: (data ?? []) as OrderRecord[] };
  }

  const data = readLocalCustomerData();
  const userOrders = data.orders
    .filter(order => order.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { orders: userOrders };
}

export function getAllLocalOnlineOrders(): OrderRecord[] {
  const data = readLocalCustomerData();
  return [...data.orders].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

export async function placeCustomerOrder(params: {
  user: CustomerUser;
  items: { product: StoreProduct; quantity: number }[];
  totalAmount: number;
  currencyCode: string;
  shipping: ShippingDetails;
}): Promise<{ order?: OrderRecord; error?: string }> {
  const { user, items, totalAmount, currencyCode, shipping } = params;

  if (supabase) {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "confirmed",
        customer_email: user.email,
        total: totalAmount.toFixed(2),
        currency_code: currencyCode,
        shipping_address: shipping,
      })
      .select("id,status,total,currency_code,shipping_address,created_at")
      .single();

    if (error || !order) {
      return {
        error: error?.message || "Your order could not be placed right now.",
      };
    }

    const itemPayloads = items.map(item => ({
      order_id: order.id,
      product_id: UUID_RE.test(item.product.id) ? item.product.id : null,
      title: item.product.title,
      quantity: item.quantity,
      unit_price: item.product.priceRange.minVariantPrice.amount,
      image_url: productImage(item.product).url,
    }));

    const { data: createdItems, error: itemError } = await supabase
      .from("order_items")
      .insert(itemPayloads)
      .select("id,product_id,title,quantity,unit_price,image_url");

    if (itemError) {
      return { error: itemError.message };
    }

    return {
      order: {
        id: order.id,
        status: order.status,
        total: String(order.total),
        currency_code: order.currency_code,
        created_at: order.created_at,
        shipping_address: order.shipping_address as ShippingDetails | null,
        order_items: (createdItems ?? []) as OrderItemRecord[],
      },
    };
  }

  const orderId = makeId("ord");
  const now = new Date().toISOString();
  const orderItems: OrderItemRecord[] = items.map(item => ({
    id: makeId("item"),
    product_id: item.product.id,
    title: item.product.title,
    quantity: item.quantity,
    unit_price: item.product.priceRange.minVariantPrice.amount,
    image_url: productImage(item.product).url,
  }));

  const record: OrderRecord & { user_id: string; customer_email: string } = {
    id: orderId,
    user_id: user.id,
    customer_email: user.email,
    status: "confirmed",
    total: totalAmount.toFixed(2),
    currency_code: currencyCode,
    created_at: now,
    shipping_address: shipping,
    order_items: orderItems,
  };

  const data = readLocalCustomerData();
  data.orders.unshift(record);
  writeLocalCustomerData(data);

  return { order: record };
}
