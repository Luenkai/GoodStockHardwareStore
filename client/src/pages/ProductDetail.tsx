import { motion } from "framer-motion";
import { ArrowLeft, Check, Minus, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useRoute } from "wouter";
import AddToCartButton from "@/components/store/AddToCartButton";
import StoreLayout from "@/components/store/StoreLayout";
import { trpc } from "@/lib/trpc";
import { formatMoney, productImage, productIsAvailable, type StoreProduct } from "@/lib/storefront";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:handle");
  const handle = params?.handle ?? "";
  const query = trpc.storefront.productByHandle.useQuery({ handle }, { enabled: Boolean(handle), retry: 1 });
  const [quantity, setQuantity] = useState(1);
  const product = query.data as StoreProduct | null | undefined;

  return (
    <StoreLayout>
      <main id="main-content" className="page-width product-detail-page">
        <Link href="/products" className="back-link"><ArrowLeft size={17} /> Back to hardware</Link>
        {query.isLoading ? <div className="detail-skeleton" aria-busy="true" aria-label="Loading product"><div className="skeleton detail-skeleton__image" /><div className="detail-skeleton__copy"><div className="skeleton-line" /><div className="skeleton-line skeleton-line--short" /><div className="skeleton detail-skeleton__button" /></div></div> : query.isError ? (
          <section className="catalog-state" role="alert"><h1>Product details could not load.</h1><p>Try again in a moment.</p><button type="button" className="button button--dark" onClick={() => void query.refetch()}><RefreshCw size={17} /> Try again</button></section>
        ) : !product ? (
          <section className="empty-state"><h1>That product is no longer available.</h1><p>Browse the current hardware catalog to find what you need.</p><Link className="button button--dark" href="/products">Shop all hardware</Link></section>
        ) : (() => {
          const image = productImage(product);
          const variant = product.variants.nodes[0];
          const available = productIsAvailable(product);
          const checkoutReady = product.source === "supabase" || product.source === "shopify";
          const descriptionLines = product.description.split(/\n+/).map(line => line.trim()).filter(Boolean);
          return (
            <motion.section className="product-detail" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }}>
              <div className="product-detail__media"><img src={image.url} alt={image.altText || product.title} /></div>
              <div className="product-detail__copy">
                <p className="eyebrow">{product.productType || "Hardware"}</p>
                <h1>{product.title}</h1>
                <div className="product-detail__price-row"><p className="detail-price">{formatMoney(product.priceRange.minVariantPrice)}</p><span className={available && checkoutReady ? "stock-note" : "stock-note stock-note--out"}><span className="stock-note__dot" aria-hidden="true" />{!checkoutReady ? "Demo listing" : available ? "In stock" : "Currently unavailable"}</span></div>
                <p className="product-detail__intro">{descriptionLines[0] || "Product details from the connected Shopify catalog."}</p>
                {descriptionLines.length > 1 && <div className="spec-list"><h2>Product details</h2><ul>{descriptionLines.slice(1).map((line, index) => <li key={`${index}-${line}`}><Check size={15} aria-hidden="true" /><span>{line.replace(/^[-•]\s*/, "")}</span></li>)}</ul></div>}
                <div className="purchase-panel">
                  <label className="quantity-label" htmlFor="product-quantity">Quantity</label>
                  <div className="quantity-control">
                    <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus size={16} /></button>
                    <input id="product-quantity" value={quantity} inputMode="numeric" readOnly aria-live="polite" />
                    <button type="button" aria-label="Increase quantity" disabled={quantity >= 99} onClick={() => setQuantity(value => Math.min(99, value + 1))}><Plus size={16} /></button>
                  </div>
                  <AddToCartButton product={product} quantity={quantity} disabled={!checkoutReady || !available} />
                </div>
                <p className="checkout-note">{product.source === "shopify" ? "Secure payment and delivery options are handled at Shopify checkout." : "Demo checkout saves an order record in Supabase and does not collect payment."}</p>
                <div className="product-detail__meta"><span>Sold by {product.vendor || "Goodstock Hardware"}</span></div>
              </div>
            </motion.section>
          );
        })()}
      </main>
    </StoreLayout>
  );
}
