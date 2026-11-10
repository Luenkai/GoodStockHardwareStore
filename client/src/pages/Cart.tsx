import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LoaderCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import StoreLayout from "@/components/store/StoreLayout";
import { clearCart, removeFromCart, updateCartQuantity, useDemoCart } from "@/lib/cart";
import { productImage, formatMoney } from "@/lib/storefront";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Cart() {
  const items = useDemoCart();
  const [user, setUser] = useState<User | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.product.priceRange.minVariantPrice.amount) * item.quantity, 0), [items]);

  const checkout = async () => {
    if (!supabase) { setMessage("Supabase is not configured yet."); return; }
    if (!user) { setMessage("Sign in or create an account before placing a demo order."); return; }
    if (!items.length || checkingOut) return;
    setCheckingOut(true); setMessage("");
    const { data: order, error } = await supabase.from("orders").insert({ user_id: user.id, customer_email: user.email, total: subtotal.toFixed(2), currency_code: items[0].product.priceRange.minVariantPrice.currencyCode }).select("id").single();
    if (error || !order) { setCheckingOut(false); setMessage(error?.message || "The demo order could not be created."); return; }
    const { error: itemError } = await supabase.from("order_items").insert(items.map(item => ({ order_id: order.id, product_id: item.product.id, title: item.product.title, quantity: item.quantity, unit_price: item.product.priceRange.minVariantPrice.amount, image_url: productImage(item.product).url })));
    setCheckingOut(false);
    if (itemError) { setMessage(itemError.message); return; }
    clearCart(); setOrderId(order.id); toast.success("Demo order created.");
  };

  return (
    <StoreLayout>
      <main id="main-content" className="page-width cart-page">
        <div className="cart-heading"><div><p className="eyebrow">Your selection</p><h1>Your cart.</h1></div><Link className="text-link" href="/products"><ArrowLeft size={16} /> Keep shopping</Link></div>
        {orderId ? <section className="empty-state cart-empty"><div className="empty-state__icon"><ShoppingBag size={23} /></div><h2>Demo order saved.</h2><p>Your project order <strong>{orderId.slice(0, 8)}</strong> is stored in Supabase. No payment was taken.</p><Link className="button button--accent" href="/account">View account <ArrowRight size={18} /></Link></section> : !items.length ? (
          <section className="empty-state cart-empty"><div className="empty-state__icon"><ShoppingBag size={23} /></div><h2>Your cart is ready when you are.</h2><p>Find the fasteners and electrical essentials for the next job.</p><Link className="button button--accent" href="/products">Shop hardware <ArrowRight size={18} /></Link></section>
        ) : (
          <div className="cart-layout">
            <section className="cart-lines" aria-label="Items in your cart"><p className="cart-lines__count" aria-live="polite">{totalQuantity} {totalQuantity === 1 ? "item" : "items"}</p><AnimatePresence initial={false}>{items.map(item => { const image = productImage(item.product); const price = item.product.priceRange.minVariantPrice; return <motion.article className="cart-line" key={item.product.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }} transition={{ duration: 0.2 }}>
              <Link className="cart-line__image" href={`/products/${item.product.handle}`}><img src={image.url} alt={image.altText || item.product.title} /></Link>
              <div className="cart-line__details"><Link className="cart-line__title" href={`/products/${item.product.handle}`}>{item.product.title}</Link><span className="cart-line__variant">{item.product.productType}</span><span className="price">{formatMoney(price)}</span><div className="cart-line__controls"><div className="quantity-control quantity-control--small" aria-label={`Quantity for ${item.product.title}`}><button type="button" aria-label="Decrease quantity" disabled={item.quantity <= 1} onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}><Minus size={14} /></button><span className="quantity-control__value">{item.quantity}</span><button type="button" aria-label="Increase quantity" disabled={item.quantity >= 99} onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}><Plus size={14} /></button></div><button type="button" className="remove-line" onClick={() => removeFromCart(item.product.id)}><Trash2 size={14} /> Remove</button></div></div>
              <p className="cart-line__total price">{formatMoney({ amount: (Number(price.amount) * item.quantity).toFixed(2), currencyCode: price.currencyCode })}</p>
            </motion.article>; })}</AnimatePresence></section>
            <aside className="cart-summary" aria-labelledby="summary-title"><h2 id="summary-title">Demo order summary</h2><div className="summary-row"><span>Subtotal</span><strong className="price">{formatMoney({ amount: subtotal.toFixed(2), currencyCode: items[0].product.priceRange.minVariantPrice.currencyCode })}</strong></div><p>No payment is collected. This creates a project order record in Supabase.</p>{message && <p className="account-error" role="alert">{message}</p>}<button type="button" className="button button--accent button--checkout" onClick={() => void checkout()} disabled={checkingOut}>{checkingOut ? <><LoaderCircle size={18} className="spin" /> Saving order</> : <>{user ? "Place demo order" : "Sign in to checkout"} <ArrowRight size={18} /></>}</button><span className="summary-secure">Free demo checkout powered by Supabase</span></aside>
          </div>
        )}
      </main>
    </StoreLayout>
  );
}
