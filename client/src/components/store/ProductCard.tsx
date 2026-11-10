import { ArrowUpRight, LoaderCircle, Plus } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatMoney, productImage, productIsAvailable, type StoreProduct } from "@/lib/storefront";

export default function ProductCard({ product, index = 0 }: { product: StoreProduct; index?: number }) {
  const utils = trpc.useUtils();
  const variant = product.variants.nodes[0];
  const image = productImage(product);
  const available = productIsAvailable(product);
  const checkoutReady = product.source === "shopify";
  const addToCart = trpc.storefront.cart.add.useMutation({
    onSuccess: async () => {
      await utils.storefront.cart.get.invalidate();
      toast.success(`${product.title} added to your cart.`);
    },
    onError: error => toast.error(error.message || "That item could not be added. Try again."),
  });

  return (
    <article className="product-card" style={{ "--card-index": index } as React.CSSProperties}>
      <Link href={`/products/${product.handle}`} className="product-card__image-link" aria-label={`Preview ${product.title}`}>
        <div className="product-card__image-wrap">
          <img src={image.url} alt={image.altText || product.title} loading="lazy" />
          <span className="product-card__open" aria-hidden="true"><ArrowUpRight size={18} /></span>
        </div>
      </Link>
      <div className="product-card__body">
        <div className="product-card__copy">
          <p className="product-card__category">{product.productType || "Hardware"}</p>
          <h3><Link href={`/products/${product.handle}`}>{product.title}</Link></h3>
          <div className="product-card__price-row">
            <span className="price">{formatMoney(product.priceRange.minVariantPrice)}</span>
              <span className={available && checkoutReady ? "stock-note" : "stock-note stock-note--out"}>
              <span className="stock-note__dot" aria-hidden="true" />{!checkoutReady ? "Demo listing" : available ? "In stock" : "Unavailable"}
            </span>
          </div>
        </div>
        <button
          className="quick-add"
          type="button"
          aria-label={`Add ${product.title} to cart`}
          disabled={!checkoutReady || !available || !variant || addToCart.isPending}
          onClick={() => variant && addToCart.mutate({ merchandiseId: variant.id, quantity: 1 })}
        >
          {addToCart.isPending ? <LoaderCircle size={18} className="spin" aria-hidden="true" /> : <Plus size={19} aria-hidden="true" />}
        </button>
      </div>
    </article>
  );
}
