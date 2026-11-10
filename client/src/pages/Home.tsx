import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import ProductCard from "@/components/store/ProductCard";
import StoreLayout from "@/components/store/StoreLayout";
import { trpc } from "@/lib/trpc";
import { formatMoney, productImage, type StoreProduct } from "@/lib/storefront";

function StorefrontSkeleton() {
  return (
    <div className="page-width home-skeleton" aria-busy="true" role="status" aria-live="polite">
      <span className="sr-only" role="status" aria-live="polite">Loading the hardware catalog…</span>
      <div className="skeleton hero-skeleton" />
      <div className="skeleton-line" />
      <div className="skeleton-grid"><div className="skeleton product-skeleton" /><div className="skeleton product-skeleton" /></div>
    </div>
  );
}

function StorefrontError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="catalog-state" role="alert">
      <span className="catalog-state__eyebrow">Store connection</span>
      <h1>The hardware catalog could not load.</h1>
      <p>Try again in a moment. If this keeps happening, check the Supabase catalog connection.</p>
      <button type="button" className="button button--dark" onClick={onRetry}><RefreshCw size={17} /> Try again</button>
    </section>
  );
}

function CategoryTiles({ fastener, tools, electrical }: { fastener?: StoreProduct; tools?: StoreProduct; electrical?: StoreProduct }) {
  const cards = [
    { id: "fasteners", name: "Fasteners", detail: "Screws and the small parts that hold a fix together.", product: fastener },
    { id: "tools", name: "Tools", detail: "Practical hand tools for measuring and everyday repairs.", product: tools },
    { id: "power-electrical", name: "Power & electrical", detail: "Electrical supplies and components for compatible projects.", product: electrical },
  ];
  return (
    <section className="category-section page-width" aria-labelledby="category-title">
      <div className="section-heading section-heading--row">
        <div><p className="eyebrow">Find your aisle</p><h2 id="category-title">Start with the part you need.</h2></div>
        <Link href="/products" className="text-link">Shop all hardware <ArrowRight size={16} /></Link>
      </div>
      <div className="category-grid">
        {cards.map((card, index) => {
          const image = card.product ? productImage(card.product) : undefined;
          return (
            <motion.div key={card.id} className={`category-card category-card--${index + 1}`} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.42, delay: index * 0.08 }}>
              <Link href={`/products#${card.id}`} className="category-card__link">
                <div className="category-card__image">{image && <img src={image.url} alt="" loading="lazy" />}</div>
                <div className="category-card__copy"><div><h3>{card.name}</h3><p>{card.detail}</p></div><span aria-hidden="true"><ArrowUpRight size={20} /></span></div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const query = trpc.storefront.products.useQuery(undefined, { retry: 1, staleTime: 30_000 });
  const products = (query.data ?? []) as StoreProduct[];
  const fastener = products.find(product => product.productType.toLowerCase().includes("fastener")) ?? products[0];
  const tools = products.find(product => product.productType.toLowerCase().includes("tool"));
  const electrical = products.find(product => product.productType.toLowerCase().includes("electrical")) ?? products.find(product => product !== fastener);

  return (
    <StoreLayout>
      <main id="main-content">
        {query.isLoading ? <StorefrontSkeleton /> : query.isError ? <div className="page-width"><StorefrontError onRetry={() => void query.refetch()} /></div> : (
          <>
            {products.length === 0 ? (
              <section className="page-width catalog-state"><span className="catalog-state__eyebrow">Catalog</span><h1>Your next project starts here.</h1><p>Active products in the Supabase catalog appear here automatically.</p><Link className="button button--dark" href="/products">Browse hardware</Link></section>
            ) : (
              <>
                <section className="hero-section page-width">
                  <motion.div className="hero-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}>
                    <p className="eyebrow"><span className="eyebrow__mark" />Hardware for everyday fixes</p>
                    <h1>Build the fix.<br /><span>Make it last.</span></h1>
                    <p className="hero-copy__body">Reliable fasteners, practical hand tools, and electrical essentials for everyday repairs.</p>
                    <div className="hero-actions">
                      <Link className="button button--accent" href={fastener ? `/products/${fastener.handle}` : "/products"}>Shop the essentials <ArrowRight size={18} /></Link>
                      <Link className="quiet-link" href="/products">See all hardware</Link>
                    </div>
                  </motion.div>
                  <motion.div className="hero-showcase" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
                    {fastener && <img className="hero-showcase__product" src={productImage(fastener).url} alt={productImage(fastener).altText || fastener.title} />}
                    {fastener && (
                      <Link className="hero-product-callout" href={`/products/${fastener.handle}`}>
                        <span className="hero-product-callout__line" aria-hidden="true" />
                        <span className="hero-product-callout__copy"><span>{fastener.productType}</span><strong>{fastener.title}</strong></span>
                        <span className="price">{formatMoney(fastener.priceRange.minVariantPrice)}</span>
                      </Link>
                    )}
                  </motion.div>
                </section>
                <section className="value-strip" aria-label="How this store works">
                  <div className="page-width value-strip__inner"><p>Clear product details</p><p>Demo checkout — no payment</p><p>Orders linked to your account</p></div>
                </section>
                <CategoryTiles fastener={fastener} tools={tools} electrical={electrical} />
                <section className="product-section page-width" aria-labelledby="products-title">
                  <div className="section-heading section-heading--row">
                    <div><p className="eyebrow">On the shelf</p><h2 id="products-title">Hardware for the work ahead.</h2></div>
                    <Link href="/products" className="text-link">Browse all products <ArrowRight size={16} /></Link>
                  </div>
                  <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
                </section>
              </>
            )}
          </>
        )}
      </main>
    </StoreLayout>
  );
}
