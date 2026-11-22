import { motion } from "framer-motion";
import { ArrowLeft, Check, Minus, Plus, RefreshCw, Truck } from "lucide-react";
import { useState } from "react";
import { Link, useRoute } from "wouter";
import AddToCartButton from "@/components/store/AddToCartButton";
import StoreLayout from "@/components/store/StoreLayout";
import { trpc } from "@/lib/trpc";
import {
  formatMoney,
  productImage,
  productIsAvailable,
  type StoreProduct,
} from "@/lib/storefront";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:handle");
  const handle = params?.handle ?? "";
  const query = trpc.storefront.productByHandle.useQuery(
    { handle },
    { enabled: Boolean(handle), retry: 1 },
  );
  const [quantity, setQuantity] = useState(1);
  const product = query.data as StoreProduct | null | undefined;

  return (
    <StoreLayout>
      <main id="main-content" className="page-width product-detail-page">
        <Link href="/products" className="back-link">
          <ArrowLeft size={17} aria-hidden="true" /> Back to hardware
        </Link>

        {query.isLoading ? (
          <div className="detail-skeleton" aria-busy="true">
            <span className="sr-only" role="status" aria-live="polite">
              Loading product details…
            </span>
            <div className="skeleton detail-skeleton__image" />
            <div className="detail-skeleton__copy">
              <div className="skeleton-line" />
              <div className="skeleton-line skeleton-line--short" />
              <div className="skeleton detail-skeleton__button" />
            </div>
          </div>
        ) : query.isError ? (
          <section className="gs-card gs-state-card" role="alert">
            <h1>Product details could not load.</h1>
            <p>Try again in a moment.</p>
            <button
              type="button"
              className="gs-btn gs-btn--primary"
              onClick={() => void query.refetch()}
            >
              <RefreshCw size={17} aria-hidden="true" /> Try again
            </button>
          </section>
        ) : !product ? (
          <section className="gs-card gs-state-card">
            <h1>That product is no longer available.</h1>
            <p>Browse the current hardware catalog to find what you need.</p>
            <Link className="gs-btn gs-btn--primary" href="/products">
              Shop all hardware
            </Link>
          </section>
        ) : (
          (() => {
            const image = productImage(product);
            const available = productIsAvailable(product);
            const descriptionLines = product.description
              .split(/\n+/)
              .map(line => line.trim())
              .filter(Boolean);
            return (
              <motion.section
                className="product-detail"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32 }}
              >
                <div className="gs-card product-detail__media">
                  <img src={image.url} alt={image.altText || product.title} />
                </div>

                <div className="product-detail__copy">
                  <p className="gs-eyebrow">{product.productType || "Hardware"}</p>
                  <h1 className="gs-page-title">{product.title}</h1>

                  <div className="product-detail__price-row">
                    <p className="detail-price">
                      {formatMoney(product.priceRange.minVariantPrice)}
                    </p>
                    <span
                      className={
                        available
                          ? "stock-note"
                          : "stock-note stock-note--out"
                      }
                    >
                      <span className="stock-note__dot" aria-hidden="true" />
                      {available ? "In stock · Ready to ship" : "Out of stock"}
                    </span>
                  </div>

                  <p className="product-detail__intro">
                    {descriptionLines[0] ||
                      "Trade-grade hardware stocked by Goodstock Hardware."}
                  </p>

                  {descriptionLines.length > 1 && (
                    <div className="gs-card spec-list">
                      <h2>Specifications &amp; details</h2>
                      <ul>
                        {descriptionLines.slice(1).map((line, index) => (
                          <li key={`${index}-${line}`}>
                            <Check size={15} aria-hidden="true" />
                            <span>{line.replace(/^[-•]\s*/, "")}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="purchase-panel">
                    <label className="quantity-label" htmlFor="product-quantity">
                      Quantity
                    </label>
                    <div className="quantity-control">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={quantity <= 1}
                        onClick={() => setQuantity(value => Math.max(1, value - 1))}
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <input
                        id="product-quantity"
                        value={quantity}
                        inputMode="numeric"
                        readOnly
                        aria-live="polite"
                      />
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={quantity >= 99}
                        onClick={() => setQuantity(value => Math.min(99, value + 1))}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <AddToCartButton
                      product={product}
                      quantity={quantity}
                      disabled={!available}
                    />
                  </div>

                  <p className="checkout-note">
                    <Truck size={15} aria-hidden="true" />
                    <span>
                      Free standard delivery on orders ₱1,500+ · Same-day counter pickup available at checkout.
                    </span>
                  </p>

                  <div className="product-detail__meta">
                    <span>Supplied by {product.vendor || "Goodstock Hardware"}</span>
                  </div>
                </div>
              </motion.section>
            );
          })()
        )}
      </main>
    </StoreLayout>
  );
}
