import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LoaderCircle, Minus, Plus, RefreshCw, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import StoreLayout from "@/components/store/StoreLayout";
import { trpc } from "@/lib/trpc";
import { formatMoney, type StoreCart } from "@/lib/storefront";

function CartSkeleton() {
  return <div className="cart-skeleton" aria-busy="true" aria-label="Loading your cart"><div className="skeleton-line" /><div className="skeleton cart-skeleton__line" /><div className="skeleton cart-skeleton__line" /><div className="skeleton cart-skeleton__summary" /></div>;
}

export default function Cart() {
  const utils = trpc.useUtils();
  const query = trpc.storefront.cart.get.useQuery(undefined, { retry: 1 });
  const cart = query.data as StoreCart | null | undefined;
  const update = trpc.storefront.cart.update.useMutation({
    onSuccess: () => utils.storefront.cart.get.invalidate(),
    onError: error => toast.error(error.message || "The quantity could not be changed."),
  });
  const remove = trpc.storefront.cart.remove.useMutation({
    onSuccess: () => utils.storefront.cart.get.invalidate(),
    onError: error => toast.error(error.message || "That item could not be removed."),
  });
  const [checkingOut, setCheckingOut] = useState(false);

  const checkout = () => {
    if (!cart?.checkoutUrl || checkingOut) return;
    setCheckingOut(true);
    window.location.assign(cart.checkoutUrl);
  };

  return (
    <StoreLayout>
      <main id="main-content" className="page-width cart-page">
        <div className="cart-heading"><div><p className="eyebrow">Your selection</p><h1>Your cart.</h1></div><Link className="text-link" href="/products"><ArrowLeft size={16} /> Keep shopping</Link></div>
        {query.isLoading ? <CartSkeleton /> : query.isError ? (
          <section className="catalog-state" role="alert"><h2>Your cart could not load.</h2><p>Please refresh and try again.</p><button type="button" className="button button--dark" onClick={() => void query.refetch()}><RefreshCw size={17} /> Retry</button></section>
        ) : !cart || cart.lines.nodes.length === 0 ? (
          <section className="empty-state cart-empty"><div className="empty-state__icon"><ShoppingBag size={23} /></div><h2>Your cart is ready when you are.</h2><p>Find the fasteners and electrical essentials for the next job.</p><Link className="button button--accent" href="/products">Shop hardware <ArrowRight size={18} /></Link></section>
        ) : (
          <div className="cart-layout">
            <section className="cart-lines" aria-label="Items in your cart">
              <p className="cart-lines__count" aria-live="polite">{cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"}</p>
              <AnimatePresence initial={false}>
                {cart.lines.nodes.map(line => {
                  const merchandise = line.merchandise;
                  const image = merchandise.product.featuredImage;
                  const busy = update.isPending || remove.isPending;
                  return (
                    <motion.article className="cart-line" key={line.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }} transition={{ duration: 0.2 }}>
                      <Link className="cart-line__image" href={`/products/${merchandise.product.handle}`}><img src={image?.url || "/images/hillman-screws.jpg"} alt={image?.altText || merchandise.product.title} /></Link>
                      <div className="cart-line__details"><Link className="cart-line__title" href={`/products/${merchandise.product.handle}`}>{merchandise.product.title}</Link><span className="cart-line__variant">{merchandise.title !== "Default Title" ? merchandise.title : "Standard"}</span><span className="price">{formatMoney(merchandise.price)}</span>
                        <div className="cart-line__controls">
                          <div className="quantity-control quantity-control--small" aria-label={`Quantity for ${merchandise.product.title}`}>
                            <button type="button" aria-label="Decrease quantity" disabled={busy || line.quantity <= 1} onClick={() => update.mutate({ lineId: line.id, quantity: line.quantity - 1 })}><Minus size={14} /></button>
                            <span className="quantity-control__value">{line.quantity}</span>
                            <button type="button" aria-label="Increase quantity" disabled={busy || line.quantity >= 99} onClick={() => update.mutate({ lineId: line.id, quantity: line.quantity + 1 })}><Plus size={14} /></button>
                          </div>
                          <button type="button" className="remove-line" disabled={busy} onClick={() => remove.mutate({ lineIds: [line.id] })}><Trash2 size={14} /> Remove</button>
                        </div>
                      </div>
                      <p className="cart-line__total price">{formatMoney({ amount: (Number(merchandise.price.amount) * line.quantity).toFixed(2), currencyCode: merchandise.price.currencyCode })}</p>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </section>
            <aside className="cart-summary" aria-labelledby="summary-title">
              <h2 id="summary-title">Order summary</h2>
              <div className="summary-row"><span>Subtotal</span><strong className="price">{formatMoney(cart.cost.subtotalAmount)}</strong></div>
              <p>Shipping and applicable taxes are calculated at checkout.</p>
              <button type="button" className="button button--accent button--checkout" onClick={checkout} disabled={!cart.checkoutUrl || checkingOut}>
                {checkingOut ? <><LoaderCircle size={18} className="spin" /> Opening checkout</> : <>Continue to checkout <ArrowRight size={18} /></>}
              </button>
              <span className="summary-secure">Secure checkout powered by Shopify</span>
            </aside>
          </div>
        )}
      </main>
    </StoreLayout>
  );
}
