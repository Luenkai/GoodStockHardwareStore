import { motion } from "framer-motion";
import { ArrowRight, Bolt, CheckCircle2, RefreshCw, Truck, Wrench } from "lucide-react";
import { Link } from "wouter";
import ProductCard from "@/components/store/ProductCard";
import StoreLayout from "@/components/store/StoreLayout";
import { trpc } from "@/lib/trpc";
import type { StoreProduct } from "@/lib/storefront";

const categoryCards = [
  {
    title: "Fasteners",
    copy: "Screws, bolts, washers, and structural hardware built to hold repairs together.",
    href: "/products?category=Fasteners",
    image: "/images/fasteners-illustration.svg",
  },
  {
    title: "Tools",
    copy: "Drivers, wrenches, pliers, and measuring gear engineered for repeat bench work.",
    href: "/products?category=Tools",
    image: "/images/tools-illustration.svg",
  },
  {
    title: "Power & electrical",
    copy: "Breakers, relays, regulators, fuses, and bench components for clean electrical work.",
    href: "/products?category=Power%20%26%20Electrical",
    image: "/images/electrical-illustration.svg",
  },
];

export default function Home() {
  const productsQuery = trpc.storefront.products.useQuery(undefined, {
    retry: 1,
    staleTime: 30_000,
  });
  const products = (productsQuery.data ?? []) as StoreProduct[];
  const featured = products.slice(0, 8);

  return (
    <StoreLayout>
      <main id="main-content" className="gs-home-page">
        <section className="page-width hero">
          <motion.div
            className="hero__copy"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="gs-eyebrow">DEPENDABLE WORKSHOP SUPPLY</p>
            <h1 className="gs-display-title">Build the fix. Make it last.</h1>
            <p className="hero__lead">
              Thoughtfully stocked fasteners, hand tools, and electrical essentials—ready for contractor jobs, studio builds, and repairs you want done once.
            </p>
            <div className="hero__actions">
              <Link className="gs-btn gs-btn--primary" href="/products">
                Shop all hardware <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="gs-btn gs-btn--secondary" href="/account">
                Orders &amp; account
              </Link>
            </div>
            <dl className="hero__trust">
              <div>
                <dt>
                  <CheckCircle2 size={16} aria-hidden="true" /> Practical picks
                </dt>
                <dd>Everyday trade specs without aisle clutter.</dd>
              </div>
              <div>
                <dt>
                  <Bolt size={16} aria-hidden="true" /> Clear details
                </dt>
                <dd>Exact sizes, materials, and stock status up front.</dd>
              </div>
              <div>
                <dt>
                  <Truck size={16} aria-hidden="true" /> Fast dispatch
                </dt>
                <dd>Nationwide shipping or same-day counter pickup.</dd>
              </div>
            </dl>
          </motion.div>

          <motion.div
            className="gs-card hero__visual"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="hero__FeatureCard">
              <div className="hero__badge">
                <Wrench size={15} aria-hidden="true" /> Workshop staples
              </div>
              <img
                src="/images/combination-wrenches.webp"
                alt="Metric combination wrench set arranged by size"
              />
              <div className="hero__caption">
                <div>
                  <p>Featured bench essential</p>
                  <strong>Clear specs before it goes in the bag.</strong>
                </div>
                <Link href="/products" aria-label="Browse all hardware">
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="page-width section-block" aria-labelledby="category-heading">
          <div className="section-heading">
            <div>
              <p className="gs-eyebrow">FIND YOUR AISLE</p>
              <h2 id="category-heading">Start with what the job calls for.</h2>
            </div>
            <Link className="gs-text-link" href="/products">
              View full catalog <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="category-grid">
            {categoryCards.map(category => (
              <Link
                className="gs-card category-card"
                href={category.href}
                key={category.title}
              >
                <img src={category.image} alt="" aria-hidden="true" />
                <div>
                  <h3>{category.title}</h3>
                  <p>{category.copy}</p>
                  <span>
                    Explore {category.title.toLowerCase()}{" "}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="page-width section-block" aria-labelledby="featured-heading">
          <div className="section-heading">
            <div>
              <p className="gs-eyebrow">READY TO SHIP</p>
              <h2 id="featured-heading">Reliable parts for the bench.</h2>
            </div>
            <Link className="gs-text-link" href="/products">
              Browse all {products.length ? `(${products.length})` : ""}{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {productsQuery.isLoading ? (
            <div className="product-grid" aria-busy="true">
              <span className="sr-only" role="status" aria-live="polite">
                Loading featured products…
              </span>
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="product-skeleton" key={index} aria-hidden="true">
                  <div className="skeleton product-skeleton__image" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-line--short" />
                </div>
              ))}
            </div>
          ) : productsQuery.isError ? (
            <div className="gs-card gs-state-card" role="alert">
              <h3>Catalog temporarily unavailable</h3>
              <p>We could not load products right now. Please try again.</p>
              <button
                type="button"
                className="gs-btn gs-btn--primary"
                onClick={() => void productsQuery.refetch()}
              >
                <RefreshCw size={16} aria-hidden="true" /> Try again
              </button>
            </div>
          ) : featured.length === 0 ? (
            <div className="gs-card gs-state-card">
              <h3>No products are listed yet</h3>
              <p>Products will appear here as soon as they are published in the catalog.</p>
            </div>
          ) : (
            <div className="product-grid">
              {featured.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </section>

        <section className="page-width project-banner">
          <div className="gs-card project-banner__inner">
            <div>
              <p className="gs-eyebrow">SAVED ADDRESSES &amp; REORDERS</p>
              <h2>Keep your delivery address and project order history ready.</h2>
            </div>
            <Link className="gs-btn gs-btn--primary" href="/account">
              Manage your account <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </StoreLayout>
  );
}
