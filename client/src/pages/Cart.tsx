import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import StoreLayout from "@/components/store/StoreLayout";
import ProductCard from "@/components/store/ProductCard";
import { InlineStatus, TextField } from "@/components/store/GoodstockControls";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { clearCart, removeFromCart, updateCartQuantity, useDemoCart } from "@/lib/cart";
import { productImage, formatMoney, type StoreProduct } from "@/lib/storefront";
import { recommendProducts } from "@/lib/recommendations";
import {
  fetchCustomerOrders,
  loadCustomerProfileData,
  placeCustomerOrder,
  type OrderRecord,
  type ShippingDetails,
} from "@/lib/storeOperations";
import { trpc } from "@/lib/trpc";

const FREE_SHIPPING_THRESHOLD = 1500;
const STANDARD_SHIPPING_FEE = 120;

const PAYMENT_LABELS: Record<ShippingDetails["payment_method"], string> = {
  cod: "Cash on Delivery (COD)",
  ewallet: "GCash / Maya",
  card: "Credit / Debit Card",
};

export default function Cart() {
  const items = useDemoCart();
  const { user } = useCustomerAuth();
  const [checkingOut, setCheckingOut] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [message, setMessage] = useState("");
  const [recentProductIds, setRecentProductIds] = useState<string[]>([]);

  const [fulfillment, setFulfillment] =
    useState<ShippingDetails["fulfillment_method"]>("delivery");
  const [paymentMethod, setPaymentMethod] =
    useState<ShippingDetails["payment_method"]>("cod");
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("PH");
  const [fieldErrors, setFieldErrors] = useState<{
    recipient_name?: string;
    line1?: string;
    city?: string;
    postal_code?: string;
  }>({});

  const catalogQuery = trpc.storefront.products.useQuery(undefined, {
    retry: 1,
    staleTime: 30_000,
  });
  const catalog = (catalogQuery.data ?? []) as StoreProduct[];

  useEffect(() => {
    if (!user) return;
    let active = true;
    void loadCustomerProfileData(user).then(data => {
      if (!active) return;
      setRecipientName(
        current => current || data.address.recipient_name || data.name || user.displayName,
      );
      setPhone(current => current || data.phone || user.phone || "");
      setLine1(current => current || data.address.line1 || "");
      setLine2(current => current || data.address.line2 || "");
      setCity(current => current || data.address.city || "");
      setRegion(current => current || data.address.region || "");
      setPostalCode(current => current || data.address.postal_code || "");
      setCountry(current => current || data.address.country || "PH");
    });

    void fetchCustomerOrders(user.id).then(({ orders }) => {
      if (!active) return;
      const ids = orders
        .flatMap(order => order.order_items.map(item => item.product_id))
        .filter((id): id is string => Boolean(id));
      setRecentProductIds(ids);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.product.priceRange.minVariantPrice.amount) * item.quantity,
        0,
      ),
    [items],
  );
  const currencyCode =
    items[0]?.product.priceRange.minVariantPrice.currencyCode || "PHP";
  const shippingFee =
    fulfillment === "pickup" || subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : STANDARD_SHIPPING_FEE;
  const grandTotal = subtotal + shippingFee;

  const recommendations = useMemo(
    () => recommendProducts(catalog, items, recentProductIds),
    [catalog, items, recentProductIds],
  );

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !items.length || checkingOut) return;

    const errors: {
      recipient_name?: string;
      line1?: string;
      city?: string;
      postal_code?: string;
    } = {};

    if (!recipientName.trim()) {
      errors.recipient_name = "Enter a recipient name.";
    }
    if (fulfillment === "delivery") {
      if (!line1.trim()) errors.line1 = "Enter a street address.";
      if (!city.trim()) errors.city = "Enter a city.";
      if (!postalCode.trim()) errors.postal_code = "Enter a postal code.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCheckingOut(true);
    setMessage("");

    const shippingDetails: ShippingDetails = {
      recipient_name: recipientName.trim(),
      phone: phone.trim(),
      line1:
        fulfillment === "pickup"
          ? "Goodstock Counter Pickup"
          : line1.trim(),
      line2: fulfillment === "pickup" ? "" : line2.trim(),
      city: fulfillment === "pickup" ? "Store Counter" : city.trim(),
      region: fulfillment === "pickup" ? "" : region.trim(),
      postal_code: fulfillment === "pickup" ? "0000" : postalCode.trim(),
      country: country.trim() || "PH",
      fulfillment_method: fulfillment,
      payment_method: paymentMethod,
      shipping_fee: shippingFee.toFixed(2),
    };

    const purchasedIds = items.map(item => item.product.id);
    const result = await placeCustomerOrder({
      user,
      items,
      totalAmount: grandTotal,
      currencyCode,
      shipping: shippingDetails,
    });

    setCheckingOut(false);
    if (result.error || !result.order) {
      setMessage(result.error || "Your order could not be placed right now.");
      return;
    }

    clearCart();
    setRecentProductIds(current => [...purchasedIds, ...current]);
    setCompletedOrder(result.order);
    toast.success("Order confirmed.");
  };

  return (
    <StoreLayout>
      <main id="main-content" className="page-width cart-page">
        <div className="cart-heading">
          <div>
            <p className="gs-eyebrow">CHECKOUT &amp; BAG</p>
            <h1 className="gs-page-title">Your cart.</h1>
          </div>
          <Link className="gs-text-link" href="/products">
            <ArrowLeft size={16} aria-hidden="true" /> Continue shopping
          </Link>
        </div>

        {completedOrder ? (
          <section className="gs-card gs-order-confirmed">
            <div className="gs-order-confirmed__icon" aria-hidden="true">
              <CheckCircle2 size={28} />
            </div>
            <p className="gs-eyebrow">ORDER CONFIRMED</p>
            <h2>Thank you for your order.</h2>
            <p className="gs-order-confirmed__lead">
              Order <strong>#{completedOrder.id.slice(0, 8).toUpperCase()}</strong> is confirmed and being prepared.
            </p>

            <div className="gs-order-confirmed__meta">
              <div>
                <span>Fulfillment</span>
                <strong>
                  {completedOrder.shipping_address?.fulfillment_method === "pickup"
                    ? "Counter pickup"
                    : "Standard delivery"}
                </strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>
                  {completedOrder.shipping_address?.payment_method
                    ? PAYMENT_LABELS[completedOrder.shipping_address.payment_method]
                    : "Cash on Delivery"}
                </strong>
              </div>
              <div>
                <span>Total</span>
                <strong className="price">
                  {formatMoney({
                    amount: completedOrder.total,
                    currencyCode: completedOrder.currency_code,
                  })}
                </strong>
              </div>
            </div>

            <div className="gs-order-confirmed__actions">
              <Link className="gs-btn gs-btn--primary" href="/account">
                View order history <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="gs-btn gs-btn--secondary" href="/products">
                Shop more hardware
              </Link>
            </div>
          </section>
        ) : !items.length ? (
          <section className="gs-card gs-state-card cart-empty">
            <div className="empty-state__icon" aria-hidden="true">
              <ShoppingBag size={22} />
            </div>
            <h2>Your cart is empty.</h2>
            <p>
              Browse fasteners, hand tools, and electrical essentials to start your order.
            </p>
            <Link className="gs-btn gs-btn--primary" href="/products">
              Shop hardware <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <div className="cart-layout">
            <section className="cart-lines" aria-label="Items in your cart">
              <p className="cart-lines__count" aria-live="polite">
                {totalQuantity} {totalQuantity === 1 ? "item" : "items"} in your cart
              </p>
              <AnimatePresence initial={false}>
                {items.map(item => {
                  const image = productImage(item.product);
                  const price = item.product.priceRange.minVariantPrice;
                  return (
                    <motion.article
                      className="gs-card cart-line"
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link
                        className="cart-line__image"
                        href={`/products/${item.product.handle}`}
                      >
                        <img
                          src={image.url}
                          alt={image.altText || item.product.title}
                        />
                      </Link>
                      <div className="cart-line__details">
                        <Link
                          className="cart-line__title"
                          href={`/products/${item.product.handle}`}
                        >
                          {item.product.title}
                        </Link>
                        <span className="cart-line__variant">
                          {item.product.productType}
                        </span>
                        <span className="price">{formatMoney(price)}</span>
                        <div className="cart-line__controls">
                          <div
                            className="quantity-control quantity-control--small"
                            aria-label={`Quantity for ${item.product.title}`}
                          >
                            <button
                              type="button"
                              aria-label={`Decrease quantity for ${item.product.title}`}
                              disabled={item.quantity <= 1}
                              onClick={() =>
                                updateCartQuantity(item.product.id, item.quantity - 1)
                              }
                            >
                              <Minus size={14} aria-hidden="true" />
                            </button>
                            <span className="quantity-control__value">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity for ${item.product.title}`}
                              disabled={item.quantity >= 99}
                              onClick={() =>
                                updateCartQuantity(item.product.id, item.quantity + 1)
                              }
                            >
                              <Plus size={14} aria-hidden="true" />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="remove-line"
                            aria-label={`Remove ${item.product.title} from cart`}
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 size={14} aria-hidden="true" /> Remove
                          </button>
                        </div>
                      </div>
                      <p className="cart-line__total price">
                        {formatMoney({
                          amount: (Number(price.amount) * item.quantity).toFixed(2),
                          currencyCode: price.currencyCode,
                        })}
                      </p>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </section>

            <aside className="gs-card cart-summary" aria-labelledby="summary-title">
              <form className="gs-checkout-form" noValidate onSubmit={handleCheckout}>
                <h2 id="summary-title">Checkout details</h2>

                <fieldset className="gs-checkout-options">
                  <legend className="gs-field__label">Fulfillment method</legend>
                  <div className="gs-option-cards">
                    <label
                      className={`gs-option-card ${fulfillment === "delivery" ? "is-selected" : ""}`.trim()}
                    >
                      <input
                        type="radio"
                        name="fulfillment"
                        value="delivery"
                        checked={fulfillment === "delivery"}
                        onChange={() => setFulfillment("delivery")}
                      />
                      <Truck size={17} aria-hidden="true" />
                      <div>
                        <strong>Delivery</strong>
                        <span>
                          {subtotal >= FREE_SHIPPING_THRESHOLD
                            ? "Free"
                            : formatMoney({
                                amount: String(STANDARD_SHIPPING_FEE),
                                currencyCode,
                              })}
                        </span>
                      </div>
                    </label>
                    <label
                      className={`gs-option-card ${fulfillment === "pickup" ? "is-selected" : ""}`.trim()}
                    >
                      <input
                        type="radio"
                        name="fulfillment"
                        value="pickup"
                        checked={fulfillment === "pickup"}
                        onChange={() => setFulfillment("pickup")}
                      />
                      <Store size={17} aria-hidden="true" />
                      <div>
                        <strong>Pickup</strong>
                        <span>Free</span>
                      </div>
                    </label>
                  </div>
                </fieldset>

                <div className="gs-checkout-fields">
                  <div className="gs-form-grid gs-form-grid--two">
                    <TextField
                      id="checkout-recipient"
                      label="Recipient name"
                      value={recipientName}
                      placeholder="Alex Morgan"
                      error={fieldErrors.recipient_name}
                      onChange={event => {
                        setRecipientName(event.target.value);
                        if (fieldErrors.recipient_name) {
                          setFieldErrors(prev => ({
                            ...prev,
                            recipient_name: undefined,
                          }));
                        }
                      }}
                    />
                    <TextField
                      id="checkout-phone"
                      label="Contact phone"
                      type="tel"
                      value={phone}
                      placeholder="+63 917 123 4567"
                      onChange={event => setPhone(event.target.value)}
                    />
                  </div>

                  {fulfillment === "delivery" && (
                    <>
                      <TextField
                        id="checkout-line1"
                        label="Street address"
                        value={line1}
                        placeholder="24 Narra Street"
                        error={fieldErrors.line1}
                        onChange={event => {
                          setLine1(event.target.value);
                          if (fieldErrors.line1) {
                            setFieldErrors(prev => ({
                              ...prev,
                              line1: undefined,
                            }));
                          }
                        }}
                      />
                      <div className="gs-form-grid gs-form-grid--two">
                        <TextField
                          id="checkout-city"
                          label="City"
                          value={city}
                          placeholder="Quezon City"
                          error={fieldErrors.city}
                          onChange={event => {
                            setCity(event.target.value);
                            if (fieldErrors.city) {
                              setFieldErrors(prev => ({
                                ...prev,
                                city: undefined,
                              }));
                            }
                          }}
                        />
                        <TextField
                          id="checkout-postal"
                          label="Postal code"
                          value={postalCode}
                          placeholder="1102"
                          error={fieldErrors.postal_code}
                          onChange={event => {
                            setPostalCode(event.target.value);
                            if (fieldErrors.postal_code) {
                              setFieldErrors(prev => ({
                                ...prev,
                                postal_code: undefined,
                              }));
                            }
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="gs-field">
                  <label htmlFor="checkout-payment" className="gs-field__label">
                    Payment method
                  </label>
                  <select
                    id="checkout-payment"
                    className="gs-field__input gs-field__select"
                    value={paymentMethod}
                    onChange={event =>
                      setPaymentMethod(
                        event.target.value as ShippingDetails["payment_method"],
                      )
                    }
                  >
                    <option value="cod">Cash on Delivery (COD)</option>
                    <option value="ewallet">GCash / Maya</option>
                    <option value="card">Credit / Debit Card</option>
                  </select>
                </div>

                <div className="gs-summary-totals">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>
                      {formatMoney({
                        amount: subtotal.toFixed(2),
                        currencyCode,
                      })}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span>
                      {shippingFee === 0
                        ? "Free"
                        : formatMoney({
                            amount: shippingFee.toFixed(2),
                            currencyCode,
                          })}
                    </span>
                  </div>
                  <div className="summary-row summary-row--total">
                    <span>Total</span>
                    <strong className="price">
                      {formatMoney({
                        amount: grandTotal.toFixed(2),
                        currencyCode,
                      })}
                    </strong>
                  </div>
                </div>

                {message && (
                  <InlineStatus
                    status="error"
                    title="Couldn’t place your order"
                    body={message}
                  />
                )}

                <button
                  type="submit"
                  className="gs-btn gs-btn--primary gs-btn--full"
                  disabled={checkingOut}
                >
                  {checkingOut ? (
                    <>
                      <LoaderCircle size={17} className="spin" aria-hidden="true" />
                      Placing order…
                    </>
                  ) : (
                    <>
                      <CreditCard size={17} aria-hidden="true" />
                      Place order ·{" "}
                      {formatMoney({
                        amount: grandTotal.toFixed(2),
                        currencyCode,
                      })}
                    </>
                  )}
                </button>
              </form>
            </aside>
          </div>
        )}

        {recommendations.length > 0 && (
          <section
            className="cart-recommendations"
            aria-labelledby="cart-recommendations-title"
          >
            <div className="section-heading">
              <div>
                <p className="gs-eyebrow">PICKED FOR YOUR PROJECT</p>
                <h2 id="cart-recommendations-title">You might need these next.</h2>
              </div>
              <p className="gs-muted-copy">
                Suggestions matched to categories in your cart and order history.
              </p>
            </div>
            <div className="product-grid cart-recommendations__grid">
              {recommendations.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </section>
        )}
      </main>
    </StoreLayout>
  );
}
