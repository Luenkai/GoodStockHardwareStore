import { motion } from "framer-motion";
import { ArrowDownWideNarrow, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import ProductCard from "@/components/store/ProductCard";
import StoreLayout from "@/components/store/StoreLayout";
import { trpc } from "@/lib/trpc";
import { productIsAvailable, type StoreProduct } from "@/lib/storefront";

type SortOption = "featured" | "price-low" | "price-high" | "name";

const subscribeToHash = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  window.addEventListener("pushState", notify);
  window.addEventListener("replaceState", notify);
  return () => {
    window.removeEventListener("hashchange", notify);
    window.removeEventListener("pushState", notify);
    window.removeEventListener("replaceState", notify);
  };
};
const getHash = () => window.location.hash;
const useBrowserHash = () => useSyncExternalStore(subscribeToHash, getHash, () => "");

function CatalogPagination({
  loading,
  error,
  onLoadMore,
}: {
  loading: boolean;
  error: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="catalog-pagination">
      {error && <p className="catalog-pagination__error" role="alert">More products could not load. Try again.</p>}
      <button type="button" className="button button--dark" onClick={onLoadMore} disabled={loading} aria-busy={loading}>
        {loading ? "Loading more products…" : error ? "Retry loading products" : "Load more products"}
      </button>
    </div>
  );
}

export default function Products() {
  const [location] = useLocation();
  const search = useSearch();
  const hash = useBrowserHash();
  const query = trpc.storefront.productPage.useInfiniteQuery({}, {
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    retry: 1,
    staleTime: 30_000,
  });
  const products = query.data?.pages.flatMap(page => page.products) ?? [];
  const [term, setTerm] = useState(() => new URLSearchParams(search).get("q") ?? "");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<SortOption>("featured");
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    setTerm(new URLSearchParams(search).get("q") ?? "");
    const categoryFromHash: Record<string, string> = {
      fasteners: "Fasteners",
      "power-electrical": "Power & Electrical",
      tools: "Tools",
    };
    setCategory(categoryFromHash[hash.slice(1)] ?? "");
  }, [location, search, hash]);

  const categories = useMemo(() => [...new Set(products.map(product => product.productType).filter(Boolean))].sort(), [products]);
  const shown = useMemo(() => {
    const needle = term.trim().toLocaleLowerCase();
    let result = products.filter(product => {
      const matchesTerm = !needle || `${product.title} ${product.vendor} ${product.productType} ${product.description}`.toLocaleLowerCase().includes(needle);
      const matchesCategory = !category || product.productType === category;
      const matchesAvailability = !availableOnly || productIsAvailable(product);
      return matchesTerm && matchesCategory && matchesAvailability;
    });
    if (sort === "price-low") result = [...result].sort((a, b) => Number(a.priceRange.minVariantPrice.amount) - Number(b.priceRange.minVariantPrice.amount));
    if (sort === "price-high") result = [...result].sort((a, b) => Number(b.priceRange.minVariantPrice.amount) - Number(a.priceRange.minVariantPrice.amount));
    if (sort === "name") result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [products, term, category, sort, availableOnly]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => event.preventDefault();
  const clearFilters = () => { setTerm(""); setCategory(""); setAvailableOnly(false); };
  const loadMore = () => { void query.fetchNextPage(); };

  return (
    <StoreLayout>
      <main id="main-content" className="page-width catalog-page">
        <motion.header className="catalog-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <p className="eyebrow">The shop</p>
          <h1>Parts for projects that need to get done.</h1>
          <p>Browse the hardware, compare the details, and build a cart when you’re ready.</p>
        </motion.header>
        {query.isError && products.length === 0 ? (
          <section className="catalog-state" role="alert"><h2>Products could not load.</h2><p>Check the store connection and try again.</p><button type="button" className="button button--dark" onClick={() => void query.refetch()}>Retry</button></section>
        ) : (
          <>
            <div className="catalog-toolbar" aria-label="Product filters">
              <form className="catalog-search" role="search" onSubmit={submitSearch}>
                <Search size={18} aria-hidden="true" />
                <label className="visually-hidden" htmlFor="catalog-search">Search products</label>
                <input id="catalog-search" placeholder="Search by product, brand, or category" value={term} onChange={event => setTerm(event.target.value)} />
              </form>
              <label className="select-wrap"><span className="visually-hidden">Sort products</span><ArrowDownWideNarrow size={17} aria-hidden="true" /><select value={sort} onChange={event => setSort(event.target.value as SortOption)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label>
            </div>
            <div className="catalog-filter-row">
              <div className="filter-chips" role="group" aria-label="Filter by category">
                <button type="button" className={`filter-chip ${category ? "" : "is-active"}`} aria-pressed={!category} onClick={() => setCategory("")}>All hardware</button>
                {categories.map(value => <button type="button" key={value} className={`filter-chip ${category === value ? "is-active" : ""}`} aria-pressed={category === value} onClick={() => setCategory(category === value ? "" : value)}>{value}</button>)}
              </div>
              <label className="available-filter"><input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)} /><span className="checkbox-ui" aria-hidden="true" /><SlidersHorizontal size={16} aria-hidden="true" /> Demo availability</label>
            </div>
            {query.isLoading && products.length === 0 ? (
              <div className="product-grid product-grid--loading" aria-busy="true"><span className="sr-only" role="status" aria-live="polite">Loading products…</span>{[1, 2].map(i => <div className="skeleton product-skeleton" key={i} />)}</div>
            ) : shown.length === 0 ? (
              <section className="empty-state">
                <div className="empty-state__icon"><Search size={22} /></div>
                <h2>{query.hasNextPage ? "No matches in the products shown so far." : "No products match that search."}</h2>
                <p>{query.hasNextPage ? "Load the next set of products to continue searching." : "Try a broader term or clear the filters."}</p>
                {query.hasNextPage ? <CatalogPagination loading={query.isFetchingNextPage} error={query.isFetchNextPageError} onLoadMore={loadMore} /> : <button className="button button--dark" type="button" onClick={clearFilters}>Clear filters</button>}
              </section>
            ) : (
              <>
                <p className="result-count" aria-live="polite">{query.hasNextPage ? `${shown.length} matching ${shown.length === 1 ? "product" : "products"} loaded so far` : `${shown.length} ${shown.length === 1 ? "product" : "products"}`}</p>
                <div className="product-grid">{shown.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
                {query.hasNextPage && <CatalogPagination loading={query.isFetchingNextPage} error={query.isFetchNextPageError} onLoadMore={loadMore} />}
              </>
            )}
          </>
        )}
      </main>
    </StoreLayout>
  );
}
