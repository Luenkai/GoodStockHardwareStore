import { Link } from "wouter";
import { toast } from "sonner";
import { addToCart } from "@/lib/cart";
import {
  formatMoney,
  productImage,
  productIsAvailable,
  type StoreProduct,
} from "@/lib/storefront";

export default function ProductCard({
  product,
  index = 0,
}: {
  product: StoreProduct;
  index?: number;
}) {
  const image = productImage(product);
  const available = productIsAvailable(product);
  const checkoutReady = product.source === "supabase";

  const onAdd = () => {
    if (!checkoutReady || !available) return;
    addToCart(product);
    toast.success(`${product.title} added to your cart.`);
  };

  return (
    <article
      className="product-card"
      style={{ "--card-index": index } as React.CSSProperties}
    >
      <Link
        href={`/products/${product.handle}`}
        className="product-card__image-link"
        aria-label={`View details for ${product.title}`}
      >
        <div className="product-card__image-wrap">
          <img
            src={image.url}
            alt={image.altText || product.title}
            loading="lazy"
          />
        </div>
      </Link>

      <div className="product-card__body">
        <div className="product-card__copy">
          <p className="product-card__category">
            {product.productType || "Hardware"}
          </p>
          <h3 className="product-card__title">
            <Link href={`/products/${product.handle}`}>{product.title}</Link>
          </h3>
        </div>

        <div className="product-card__price-row">
          <div className="product-card__price-group">
            <span className="price">
              {formatMoney(product.priceRange.minVariantPrice)}
            </span>
            <span className="product-card__demo-tag">demo</span>
          </div>
          {checkoutReady ? (
            <span
              className={
                available ? "stock-note" : "stock-note stock-note--out"
              }
            >
              <span className="stock-note__dot" aria-hidden="true" />
              {available ? "In stock" : "Unavailable"}
            </span>
          ) : null}
        </div>

        <div className="product-card__actions">
          {checkoutReady && available ? (
            <>
              <Link
                href={`/products/${product.handle}`}
                className="gs-btn gs-btn--secondary"
              >
                View details
              </Link>
              <button
                type="button"
                className="gs-btn gs-btn--primary"
                aria-label={`Add ${product.title} to cart`}
                onClick={onAdd}
              >
                Add to cart
              </button>
            </>
          ) : (
            <Link
              href={`/products/${product.handle}`}
              className="gs-btn gs-btn--secondary gs-btn--full"
            >
              View details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
