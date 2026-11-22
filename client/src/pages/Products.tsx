import { RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLocation, useSearch } from "wouter";
import ProductCard from "@/components/store/ProductCard";
import StoreLayout from "@/components/store/StoreLayout";
import { trpc } from "@/lib/trpc";
import { productIsAvailable, type StoreProduct } from "@/lib/storefront";

type SortOption = "featured" | "price-low" | "price-high" | "name";

const DEFAULT_AISLES = [
  { key: "All", label: "All hardware" },
  { key: "Fasteners", label: "Fasteners" },
  { key: "Tools", label: "Tools" },
  { key: "Power & Electrical", label: "Power & electrical" },
];

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

export default function Products() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const hash = useBrowserHash();
  const pageQuery = trpc.storefront.productPage.useInfiniteQuery(
    {},
    {
      getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
      retry: 1,
      staleTime: 30_000,
    },
  );

  const products = useMemo(
    () =>
      (pageQuery.data?.pages.flatMap(page => page.products) ?? []) as StoreProduct[],
    [pageQuery.data],
  );

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<SortOption>("featured");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    setQuery(params.get("q") ?? "");
    const paramCat = (params.get("category") ?? "").trim().toLowerCase();
    if (paramCat === "fasteners") {
      setCategory("Fasteners");
      return;
    }
    if (paramCat === "tools") {
      setCategory("Tools");
      return;
    }
    if (paramCat === "power & electrical" || paramCat === "electrical") {
      setCategory("Power & Electrical");
      return;
    }
    if (paramCat) {
      const matched = products.find(
        p => p.productType.toLowerCase() === paramCat,
      );
      setCategory(matched ? matched.productType : params.get("category")!);
      return;
    }

    const cleanHash = hash.replace(/^#/, "").toLowerCase();
    if (cleanHash === "fasteners") setCategory("Fasteners");
    else if (cleanHash === "tools") setCategory("Tools");
    else if (cleanHash === "electrical") setCategory("Power & Electrical");
    else setCategory("All");
  }, [searchString, hash, products]);

  const aisles = useMemo(() => {
    const known = new Set(DEFAULT_AISLES.map(item => item.key.toLowerCase()));
    const dynamic = Array.from(
      new Set(products.map(p => p.productType).filter(Boolean)),
    )
      .filter(type => !known.has(type.toLowerCase()))
      .map(type => ({ key: type, label: type }));
    return [...DEFAULT_AISLES, ...dynamic];
  }, [products]);

  const selectCategory = (nextKey: string) => {
    setCategory(nextKey);
    const params = new URLSearchParams(searchString);
    if (nextKey === "All") params.delete("category");
    else params.set("category", nextKey);
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    const qs = params.toString();
    setLocation(qs ? `/products?${qs}` : "/products");
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("All");
    setOnlyAvailable(false);
    setSort("featured");
    setLocation("/products");
  };

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return products
      .filter(product => {
        if (
          category !== "All" &&
          product.productType.toLowerCase() !== category.toLowerCase()
        ) {
          return false;
        }
        if (onlyAvailable && !productIsAvailable(product)) {
          return false;
        }
        if (!clean) return true;
        return [
          product.title,
          product.description,
          product.productType,
          product.vendor,
          ...product.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(clean);
      })
      .sort((a, b) => {
        if (sort === "price-low") {
          return (
            Number(a.priceRange.minVariantPrice.amount) -
            Number(b.priceRange.minVariantPrice.amount)
          );
        }
        if (sort === "price-high") {
          return (
            Number(b.priceRange.minVariantPrice.amount) -
            Number(a.priceRange.minVariantPrice.amount)
          );
        }
        if (sort === "name") return a.title.localeCompare(b.title);
        return 0;
      });
  }, [products, query, category, onlyAvailable, sort]);

  const hasActiveFilters =
    Boolean(query.trim()) ||
    category !== "All" ||
    onlyAvailable ||
    sort !== "featured";

  return (
    <StoreLayout>
      <main id="main-content" className="page-width gs-catalog-page">
        <section className="gs-catalog-intro" aria-labelledby="catalog-heading">
          <div className="gs-catalog-intro__copy">
            <p className="gs-eyebrow">THE SHOP</p>
            <h1 id="catalog-heading" className="gs-page-title">
              Parts for projects that need to get done.
            </h1>
            <p className="gs-page-lead">
              Browse trade-grade fasteners, tools, and electrical components, compare specifications, and add what you need to your order.
            </p>
          </div>
        </section>

        {/* Quick Aisle Chips + Filter Toggle on Mobile / Tablet */}
        <div className="gs-catalog-mobile-bar">
          <div
            className="gs-catalog-pills"
            role="group"
            aria-label="Quick category filter"
          >
            {aisles.map(aisle => {
              const isSelected =
                category.toLowerCase() === aisle.key.toLowerCase();
              return (
                <button
                  key={aisle.key}
                  type="button"
                  className={`gs-catalog-pill ${isSelected ? "is-selected" : ""}`.trim()}
                  aria-pressed={isSelected}
                  onClick={() => selectCategory(aisle.key)}
                >
                  {aisle.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="gs-btn gs-btn--secondary gs-btn--compact gs-catalog-filter-toggle"
            aria-expanded={mobileFiltersOpen}
            onClick={() => setMobileFiltersOpen(open => !open)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>{mobileFiltersOpen ? "Hide filters" : "Filters"}</span>
          </button>
        </div>

        <div className="gs-catalog-workspace">
          <aside
            className={`gs-catalog-filters ${mobileFiltersOpen ? "is-open" : ""}`.trim()}
            aria-label="Catalog filters"
          >
            <div className="gs-filter-group">
              <h2 className="gs-filter-heading">Find your aisle</h2>
              <div className="gs-aisle-list" role="group" aria-label="Hardware categories">
                {aisles.map(aisle => {
                  const isSelected =
                    category.toLowerCase() === aisle.key.toLowerCase();
                  return (
                    <button
                      key={aisle.key}
                      type="button"
                      className={`gs-aisle-btn ${isSelected ? "is-selected" : ""}`.trim()}
                      aria-pressed={isSelected}
                      onClick={() => selectCategory(aisle.key)}
                    >
                      <span>{aisle.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="gs-filter-group gs-filter-card">
              <span className="gs-filter-subhead">Availability</span>
              <label className="gs-check-row">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={event => setOnlyAvailable(event.target.checked)}
                />
                <span>In stock &amp; ready to ship</span>
              </label>
              <button
                type="button"
                className="gs-btn gs-btn--secondary gs-btn--full"
                disabled={!hasActiveFilters}
                onClick={resetFilters}
              >
                Reset filters
              </button>
            </div>

            <div className="gs-reassurance-box">
              <p>Compare sizes, materials, and compatibility before you order.</p>
            </div>
          </aside>

          <section className="gs-catalog-results" aria-label="Product results">
            <div className="gs-catalog-controls">
              <div className="gs-field">
                <label htmlFor="catalog-search-input" className="gs-field__label">
                  Search catalog
                </label>
                <div className="gs-search-input-wrap">
                  <Search size={18} className="gs-search-input-wrap__icon" aria-hidden="true" />
                  <input
                    id="catalog-search-input"
                    type="search"
                    className="gs-field__input gs-field__input--with-icon"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search by part, size, or brand"
                  />
                  {query && (
                    <button
                      type="button"
                      className="gs-search-clear"
                      aria-label="Clear catalog search"
                      onClick={() => setQuery("")}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="gs-field">
                <label htmlFor="catalog-sort-select" className="gs-field__label">
                  Sort by
                </label>
                <select
                  id="catalog-sort-select"
                  className="gs-field__input gs-field__select"
                  value={sort}
                  onChange={event => setSort(event.target.value as SortOption)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>

            <div className="gs-result-summary">
              <p className="gs-result-summary__count" aria-live="polite">
                {pageQuery.isLoading
                  ? "Loading products…"
                  : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="gs-link-btn"
                  onClick={resetFilters}
                >
                  Clear active filters
                </button>
              )}
            </div>

            {pageQuery.isLoading ? (
              <div className="product-grid" aria-busy="true">
                <span className="sr-only" role="status" aria-live="polite">
                  Loading products…
                </span>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div className="product-skeleton" key={index} aria-hidden="true">
                    <div className="skeleton product-skeleton__image" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line--short" />
                  </div>
                ))}
              </div>
            ) : pageQuery.isError ? (
              <section className="gs-card gs-state-card" role="alert">
                <h2>Hardware catalog unavailable.</h2>
                <p>
                  {pageQuery.error.message ||
                    "Check your connection and try loading the catalog again."}
                </p>
                <button
                  type="button"
                  className="gs-btn gs-btn--primary"
                  onClick={() => void pageQuery.refetch()}
                >
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              </section>
            ) : filtered.length === 0 ? (
              <section className="gs-card gs-state-card">
                <h2>No matching hardware found.</h2>
                <p>
                  Try a broader search term, choose another aisle, or reset your active filters.
                </p>
                <button
                  type="button"
                  className="gs-btn gs-btn--secondary"
                  onClick={resetFilters}
                >
                  Reset filters
                </button>
              </section>
            ) : (
              <>
                <div className="product-grid">
                  {filtered.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>

                {pageQuery.hasNextPage && (
                  <div className="catalog-pagination">
                    {pageQuery.isFetchNextPageError && (
                      <p role="alert">Could not load more products. Please try again.</p>
                    )}
                    <button
                      type="button"
                      className="gs-btn gs-btn--secondary"
                      disabled={pageQuery.isFetchingNextPage}
                      onClick={() => void pageQuery.fetchNextPage()}
                    >
                      {pageQuery.isFetchingNextPage
                        ? "Loading more…"
                        : "Load more products"}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="gs-catalog-helper">
              <p>Need a specific fastener or tool? Search above by thread size, part name, or brand.</p>
            </div>
          </section>
        </div>
      </main>
    </StoreLayout>
  );
}
