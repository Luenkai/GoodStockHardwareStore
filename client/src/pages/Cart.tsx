import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LoaderCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import StoreLayout from "@/components/store/StoreLayout";
import ProductCard from "@/components/store/ProductCard";
import { InlineStatus } from "@/components/store/GoodstockControls";
import { clearCart, removeFromCart, updateCartQuantity, useDemoCart } from "@/lib/cart";
import { productImage, formatMoney, type StoreProduct } from "@/lib/storefront";
import { recommendProducts } from "@/lib/recommendations";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import type { User } from "@supabase/supabase-js";

export default function Cart() {
  const items = useDemoCart();
  const [user, setUser] = useState<User | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [recentProductIds, setRecentProductIds] = useState<string[]>([]);
  const catalogQuery = trpc.storefront.products.useQuery(undefined, {
    retry: 1,
    staleTime: 30_000,
  });
  const catalog = (catalogQuery.data ?? []) as StoreProduct[];

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !user) {
      setRecentProductIds([]);
      return;
    }
    let active = true;
    const loadRecentPurchases = async () => {
      const { data: orders, error: ordersError } = await client
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!active) return;
      if (ordersError || !orders?.length) {
        setRecentProductIds([]);
        return;
      }
      const { data: orderItems, error: itemsError } = await client
        .from("order_items")
        .select("product_id")
        .in(
          "order_id",
          orders.map(order => order.id),
        )
        .limit(50);
      if (!active) return;
      setRecentProductIds(
        itemsError
          ? []
          : (orderItems ?? [])
              .map(item => item.product_id)
              .filter((id): id is string => Boolean(id)),
      );
    };
    void loadRecentPurchases();
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
  const recommendations = useMemo(
    () => recommendProducts(catalog, items, recentProductIds),
    [catalog, items, recentProductIds],
  );

  const checkout = async () => {
    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }
    if (!user) {
      setMessage("Sign in or create an account before placing a demo order.");
      return;
    }
    if (!items.length || checkingOut) return;
    setCheckingOut(true);
    setMessage("");
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        customer_email: user.email,
        total: subtotal.toFixed(2),
        currency_code: items[0].product.priceRange.minVariantPrice.currencyCode,
      })
      .select("id")
      .single();
    if (error || !order) {
      setCheckingOut(false);
      setMessage(error?.message || "The demo order could not be created.");
      return;
    }
    const { error: itemError } = await supabase.from("order_items").insert(
      items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        title: item.product.title,
        quantity: item.quantity,
        unit_price: item.product.priceRange.minVariantPrice.amount,
        image_url: productImage(item.product).url,
      })),
    );
    setCheckingOut(false);
    if (itemError) {
      setMessage(itemError.message);
      return;
    }
    const purchasedIds = items.map(item => item.product.id);
    clearCart();
    setRecentProductIds(current => [...purchasedIds, ...current]);
    setOrderId(order.id);
    toast.success("Demo order created.");
  };

  return (
    <StoreLayout>
      <main id="main-content" className="page-width cart-page">
        <div className="cart-heading">
          <div>
            <p className="gs-eyebrow">YOUR SELECTION</p>
            <h1 className="gs-page-title">Your cart.</h1>
          </div>
          <Link className="gs-text-link" href="/products">
            <ArrowLeft size={16} aria-hidden="true" /> Keep shopping
          </Link>
        </div>

        {orderId ? (
          <section className="gs-card gs-state-card cart-empty">
            <div className="empty-state__icon" aria-hidden="true">
              <ShoppingBag size={22} />
            </div>
            <h2>Demo order saved.</h2>
            <p>
              Your project order <strong>{orderId.slice(0, 8)}</strong> is stored in Supabase. No payment was taken.
            </p>
            <Link className="gs-btn gs-btn--primary" href="/account">
              View account <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>
        ) : !items.length ? (
          <section className="gs-card gs-state-card cart-empty">
            <div className="empty-state__icon" aria-hidden="true">
              <ShoppingBag size={22} />
            </div>
            <h2>Your cart is ready when you are.</h2>
            <p>
              Find fasteners, practical hand tools, and electrical essentials for the next job.
            </p>
            <Link className="gs-btn gs-btn--primary" href="/products">
              Shop hardware <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <div className="cart-layout">
            <section className="cart-lines" aria-label="Items in your cart">
              <p className="cart-lines__count" aria-live="polite">
                {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
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
              <h2 id="summary-title">Demo order summary</h2>
              <div className="summary-row">
                <span>Subtotal</span>
                <strong className="price">
                  {formatMoney({
                    amount: subtotal.toFixed(2),
                    currencyCode:
                      items[0].product.priceRange.minVariantPrice.currencyCode,
                  })}
                </strong>
              </div>
              <p>
                No payment is collected. This creates a project order record in Supabase.
              </p>
              {message && (
                <InlineStatus
                  status="error"
                  title="Couldn’t place demo order"
                  body={message}
                />
              )}
              {user ? (
                <button
                  type="button"
                  className="gs-btn gs-btn--primary gs-btn--full"
                  onClick={() => void checkout()}
                  disabled={checkingOut}
                >
                  {checkingOut ? (
                    <>
                      <LoaderCircle size={17} className="spin" aria-hidden="true" />{" "}
                      Saving order…
                    </>
                  ) : (
                    <>
                      Place demo order <ArrowRight size={17} aria-hidden="true" />
                    </>
                  )}
                </button>
              ) : (
                <Link className="gs-btn gs-btn--primary gs-btn--full" href="/account">
                  Sign in to checkout <ArrowRight size={17} aria-hidden="true" />
                </Link>
              )}
              <span className="summary-secure">
                Free demo checkout · No payment details collected
              </span>
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
                Suggestions match product categories from your cart or recent orders.
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
