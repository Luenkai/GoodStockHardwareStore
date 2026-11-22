import { ArrowRight, ArrowUpRight, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useDemoCart } from "@/lib/cart";
import { ThemeToggleButton } from "@/components/store/GoodstockControls";
import { useTheme } from "@/contexts/ThemeContext";

const SHOP_CATEGORIES = [
  { label: "Shop all", href: "/products", key: "all" },
  { label: "Fasteners", href: "/products?category=Fasteners", key: "fasteners" },
  { label: "Tools", href: "/products?category=Tools", key: "tools" },
  {
    label: "Power & electrical",
    href: "/products?category=Power%20%26%20Electrical",
    key: "power & electrical",
  },
];

export default function StoreLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");
  const cartItems = useDemoCart();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    setHeaderQuery(params.get("q") ?? "");
  }, [searchString]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location, searchString]);

  const params = new URLSearchParams(searchString);
  const activeCategoryParam = (params.get("category") ?? "").trim().toLowerCase();
  const isProductsPage = location === "/products";
  const showContinueShopping =
    location === "/account" || location === "/cart" || location.startsWith("/products/");

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = headerQuery.trim();
    const nextParams = new URLSearchParams();
    if (trimmed) nextParams.set("q", trimmed);
    if (activeCategoryParam) nextParams.set("category", params.get("category") ?? "");
    const suffix = nextParams.toString();
    setLocation(suffix ? `/products?${suffix}` : "/products");
    setMenuOpen(false);
  };

  return (
    <div className="store-shell" data-inert-target="true">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="gs-header">
        {/* Desktop Service Bar / Mobile Demo Store Notice */}
        <div className="gs-service-bar">
          <div className="page-width gs-service-bar__inner">
            <span className="gs-service-bar__tagline">
              Good tools. Clear choices. Back to the work.
            </span>
            <span className="gs-service-bar__demo">
              Demo store · No payment details collected
            </span>
          </div>
        </div>

        {/* Main Navigation Bar (88px) */}
        <div className="gs-main-nav">
          <div className="page-width gs-main-nav__inner">
            <Link
              href="/store"
              className="gs-wordmark"
              aria-label="Goodstock Hardware storefront home"
            >
              <span className="gs-wordmark__name">goodstock</span>
              <span className="gs-wordmark__sub">HARDWARE</span>
            </Link>

            <form
              className="gs-header-search"
              role="search"
              onSubmit={handleSearchSubmit}
            >
              <label htmlFor="gs-header-search-input" className="sr-only">
                Search hardware
              </label>
              <Search size={18} className="gs-header-search__icon" aria-hidden="true" />
              <input
                id="gs-header-search-input"
                type="search"
                value={headerQuery}
                onChange={event => setHeaderQuery(event.target.value)}
                placeholder="Search hardware"
                autoComplete="off"
              />
            </form>

            <div className="gs-main-nav__actions">
              <ThemeToggleButton className="gs-desktop-only" />

              <Link
                href="/account"
                className={`gs-nav-action gs-desktop-only ${location === "/account" ? "is-active" : ""}`.trim()}
              >
                <User size={17} aria-hidden="true" />
                <span>Account</span>
              </Link>

              <Link
                href="/cart"
                className={`gs-nav-cart ${location === "/cart" ? "is-active" : ""}`.trim()}
                aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
              >
                <ShoppingBag size={17} aria-hidden="true" />
                <span className="gs-nav-cart__label">Cart</span>
                <span className="gs-nav-cart__count">{cartCount}</span>
              </Link>

              <button
                type="button"
                className="gs-icon-btn gs-mobile-only"
                aria-expanded={menuOpen}
                aria-controls="gs-mobile-menu"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen(open => !open)}
              >
                {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Shop Navigation Bar (48px) */}
        <div className="gs-shop-nav">
          <div className="page-width gs-shop-nav__inner">
            <nav className="gs-shop-nav__links" aria-label="Shop categories">
              {SHOP_CATEGORIES.map(item => {
                const isActive =
                  isProductsPage &&
                  (item.key === "all"
                    ? !activeCategoryParam
                    : activeCategoryParam === item.key);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`gs-shop-nav__link ${isActive ? "is-active" : ""}`.trim()}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="gs-shop-nav__right">
              {showContinueShopping ? (
                <Link href="/products" className="gs-continue-link">
                  Continue shopping <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : (
                <Link href="/business" className="gs-workspace-link">
                  Business workspace <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div id="gs-mobile-menu" className="gs-mobile-drawer">
            <div className="page-width gs-mobile-drawer__inner">
              <form
                className="gs-header-search gs-header-search--mobile"
                role="search"
                onSubmit={handleSearchSubmit}
              >
                <label htmlFor="gs-mobile-search-input" className="sr-only">
                  Search hardware
                </label>
                <Search size={18} className="gs-header-search__icon" aria-hidden="true" />
                <input
                  id="gs-mobile-search-input"
                  type="search"
                  value={headerQuery}
                  onChange={event => setHeaderQuery(event.target.value)}
                  placeholder="Search hardware"
                  autoComplete="off"
                />
              </form>

              <nav className="gs-mobile-drawer__nav" aria-label="Mobile storefront navigation">
                {SHOP_CATEGORIES.map(item => {
                  const isActive =
                    isProductsPage &&
                    (item.key === "all"
                      ? !activeCategoryParam
                      : activeCategoryParam === item.key);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={isActive ? "is-active" : ""}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/account"
                  className={location === "/account" ? "is-active" : ""}
                  onClick={() => setMenuOpen(false)}
                >
                  Your account
                </Link>
                <Link
                  href="/business"
                  onClick={() => setMenuOpen(false)}
                >
                  Business workspace
                </Link>
              </nav>

              {toggleTheme && (
                <button
                  type="button"
                  className="gs-btn gs-btn--secondary gs-btn--full"
                  onClick={toggleTheme}
                >
                  {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="store-shell__body">{children}</div>

      <footer className="gs-footer">
        <div className="page-width gs-footer__inner">
          <span className="gs-footer__brand">© Goodstock Hardware</span>
          <p className="gs-footer__legal">
            Demo account data is handled by Supabase. No payment details are collected.
          </p>
          <div className="gs-footer__links">
            <Link href="/products" className="gs-footer__shop-link">
              Shop hardware <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
