import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/contexts/CustomerAuthContext";
import {
  fetchCustomerOrders,
  loadCustomerProfileData,
  placeCustomerOrder,
  registerCustomer,
  saveLocalProfileAndAddress,
  signInCustomer,
  signOutCustomer,
} from "./storeOperations";
import type { StoreProduct } from "./storefront";

const sampleProduct: StoreProduct = {
  id: "gid://goodstock/local-product/1",
  handle: "sheet-metal-screws",
  title: "Sheet-Metal Screws",
  description: "Zinc-plated screws",
  productType: "Fasteners",
  vendor: "Goodstock Hardware",
  tags: ["Fasteners"],
  featuredImage: {
    url: "/images/hillman-screws.jpg",
    altText: "Screws",
    width: null,
    height: null,
  },
  images: { nodes: [] },
  priceRange: {
    minVariantPrice: { amount: "149.00", currencyCode: "PHP" },
  },
  variants: {
    nodes: [
      {
        id: "var-1",
        title: "Standard",
        sku: "GS-001",
        availableForSale: true,
        price: { amount: "149.00", currencyCode: "PHP" },
      },
    ],
  },
  source: "local",
};

describe("sanitizeNextPath", () => {
  it("normalizes empty, root, external, and auth-loop paths to /store", () => {
    expect(sanitizeNextPath(null)).toBe("/store");
    expect(sanitizeNextPath("")).toBe("/store");
    expect(sanitizeNextPath("/")).toBe("/store");
    expect(sanitizeNextPath("//evil.example")).toBe("/store");
    expect(sanitizeNextPath("https://evil.example")).toBe("/store");
    expect(sanitizeNextPath("/sign-in")).toBe("/store");
    expect(sanitizeNextPath("/create-account")).toBe("/store");
  });

  it("preserves valid internal storefront and workspace destinations", () => {
    expect(sanitizeNextPath("/products?category=Tools")).toBe(
      "/products?category=Tools",
    );
    expect(sanitizeNextPath("/business/inventory")).toBe("/business/inventory");
  });
});

describe("storeOperations local persistence engine", () => {
  it("registers, signs out, signs back in, saves profile/address, and records orders", async () => {
    const uniqueEmail = `builder-${Date.now()}@example.com`;

    const reg = await registerCustomer({
      name: "Jordan Cruz",
      email: uniqueEmail,
      phone: "+63 917 888 9999",
      password: "secretPassword",
    });
    expect(reg.error).toBeUndefined();
    expect(reg.user?.email).toBe(uniqueEmail);
    expect(reg.user?.displayName).toBe("Jordan Cruz");

    const duplicate = await registerCustomer({
      name: "Jordan Cruz",
      email: uniqueEmail,
      password: "secretPassword",
    });
    expect(duplicate.error).toMatch(/already exists/i);

    await signOutCustomer();

    const wrongLogin = await signInCustomer(uniqueEmail, "wrongpass");
    expect(wrongLogin.error).toMatch(/incorrect email or password/i);

    const login = await signInCustomer(uniqueEmail, "secretPassword");
    expect(login.error).toBeUndefined();
    expect(login.user?.id).toBe(reg.user?.id);

    const activeUser = login.user!;
    await saveLocalProfileAndAddress(
      activeUser.id,
      "Jordan M. Cruz",
      "+63 917 888 0000",
      {
        recipient_name: "Jordan M. Cruz",
        label: "Home",
        line1: "88 Acacia Road",
        line2: "",
        city: "San Pablo",
        region: "Laguna",
        postal_code: "4000",
        country: "PH",
      },
    );

    const loaded = await loadCustomerProfileData(activeUser);
    expect(loaded.name).toBe("Jordan M. Cruz");
    expect(loaded.address.city).toBe("San Pablo");

    const placed = await placeCustomerOrder({
      user: activeUser,
      items: [{ product: sampleProduct, quantity: 2 }],
      totalAmount: 418,
      currencyCode: "PHP",
      shipping: {
        recipient_name: "Jordan M. Cruz",
        phone: "+63 917 888 0000",
        line1: "88 Acacia Road",
        city: "San Pablo",
        postal_code: "4000",
        country: "PH",
        fulfillment_method: "delivery",
        payment_method: "cod",
        shipping_fee: "120.00",
      },
    });
    expect(placed.error).toBeUndefined();
    expect(placed.order?.status).toBe("confirmed");
    expect(placed.order?.total).toBe("418.00");

    const history = await fetchCustomerOrders(activeUser.id);
    expect(history.orders).toHaveLength(1);
    expect(history.orders[0]?.order_items[0]?.title).toBe("Sheet-Metal Screws");
  });
});
