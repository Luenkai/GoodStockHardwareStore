import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

function Logo() {
  return (
    <Link href="/" className="brand-lockup" aria-label="Goodstock Hardware home">
      <img src="/brand-mark.svg" width="42" height="42" alt="" />
      <span>goodstock<span className="brand-lockup__descriptor">hardware</span></span>
    </Link>
  );
}

export function StoreHeader() {
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const cartQuery = trpc.storefront.cart.get.useQuery(undefined, { staleTime: 10_000, retry: 1 });
  const cart = cartQuery.data as { totalQuantity?: number } | null | undefined;
  const itemCount = cart?.totalQuantity ?? 0;

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = term.trim();
    setSearchOpen(false);
    setMenuOpen(false);
    setLocation(value ? `/products?q=${encodeURIComponent(value)}` : "/products");
  };

  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="store-header">
      <a className="skip-link" href="#main-content">Skip to products</a>
      <div className="store-header__inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/products" aria-current={location === "/products" ? "page" : undefined}>Shop all</Link>
          <Link href="/products#fasteners">Fasteners</Link>
          <Link href="/products#power-electrical">Power &amp; electrical</Link>
        </nav>
        <div className="header-actions">
          <form className="header-search" role="search" onSubmit={submitSearch}>
            <Search size={17} strokeWidth={1.8} aria-hidden="true" />
            <label className="visually-hidden" htmlFor="header-search">Search products</label>
            <input id="header-search" value={term} onChange={event => setTerm(event.target.value)} placeholder="Search hardware" />
          </form>
          <button className="icon-button mobile-search-toggle" type="button" aria-label={searchOpen ? "Close search" : "Search products"} onClick={() => setSearchOpen(open => !open)}>
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
          <Link href="/account" className="icon-button account-link" aria-label="Your account">
            <UserRound size={20} strokeWidth={1.8} />
          </Link>
          <Link href="/cart" className="icon-button cart-link" aria-label={`Your cart${itemCount ? `, ${itemCount} items` : ""}`}>
            <ShoppingBag size={20} strokeWidth={1.8} />
            {itemCount > 0 && <span className="cart-count" aria-hidden="true">{itemCount > 99 ? "99+" : itemCount}</span>}
          </Link>
          <button className="icon-button mobile-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {searchOpen && (
          <motion.form className="mobile-search-panel" role="search" onSubmit={submitSearch} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}>
            <label className="visually-hidden" htmlFor="mobile-search">Search products</label>
            <input id="mobile-search" autoFocus value={term} onChange={event => setTerm(event.target.value)} placeholder="What are you looking for?" />
            <button className="button button--dark button--compact" type="submit" aria-label="Submit search"><ArrowRight size={18} /></button>
          </motion.form>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {menuOpen && (
          <motion.nav className="mobile-nav" aria-label="Mobile navigation" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Link href="/products" onClick={closeMenu}>Shop all hardware</Link>
            <Link href="/products#fasteners" onClick={closeMenu}>Fasteners</Link>
            <Link href="/products#power-electrical" onClick={closeMenu}>Power &amp; electrical</Link>
            <Link href="/account" onClick={closeMenu}>Orders &amp; account</Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function StoreFooter() {
  return (
    <footer className="store-footer">
      <div className="store-footer__inner">
        <Logo />
        <p>Good tools. Clear choices. Back to the work.</p>
        <div className="store-footer__links">
          <Link href="/products">Shop hardware</Link>
          <Link href="/account">Orders &amp; account</Link>
          <Link href="/cart">Cart</Link>
        </div>
        <span className="store-footer__copyright">© {new Date().getFullYear()} Goodstock Hardware</span>
      </div>
    </footer>
  );
}

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-frame">
      <StoreHeader />
      {children}
      <StoreFooter />
      <div className="sr-only" aria-live="polite" id="store-announcements" />
    </div>
  );
}
