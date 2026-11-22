import { ArrowRight, BarChart3, ShieldCheck, ShoppingBag, Store, Wrench } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggleButton } from "@/components/store/GoodstockControls";

export default function Entry() {
  return (
    <main className="entry-shell" data-inert-target="true">
      <div className="page-width entry-shell__inner">
        <div className="entry-topbar">
          <div className="gs-wordmark">
            <span className="gs-wordmark__name">goodstock</span>
            <span className="gs-wordmark__sub">HARDWARE</span>
          </div>
          <ThemeToggleButton />
        </div>

        <header className="entry-hero">
          <p className="gs-eyebrow">UNIFIED PLATFORM</p>
          <h1 className="gs-display-title">Choose your workspace.</h1>
          <p className="entry-lead">
            Shop the customer catalog or sign in to the staff workspace for inventory, point-of-sale receipts, and demand forecasting.
          </p>
        </header>

        <section className="entry-grid" aria-label="Application portals">
          <article className="gs-card entry-card">
            <div className="entry-card__icon" aria-hidden="true">
              <Store size={24} />
            </div>
            <p className="gs-eyebrow">PUBLIC DEMO STOREFRONT</p>
            <h2>Customer Storefront</h2>
            <p>
              Browse fasteners, hand tools, and electrical parts, build a project cart, and save demo orders with your account.
            </p>
            <ul className="entry-card__list">
              <li>
                <ShoppingBag size={16} aria-hidden="true" /> Live and preview hardware catalog
              </li>
              <li>
                <Wrench size={16} aria-hidden="true" /> Project cart, account details, and order history
              </li>
            </ul>
            <div className="entry-card__actions">
              <Link className="gs-btn gs-btn--primary" href="/store">
                Open storefront <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="gs-text-link" href="/products">
                Browse all products <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </article>

          <article className="gs-card entry-card entry-card--business">
            <div className="entry-card__icon" aria-hidden="true">
              <BarChart3 size={24} />
            </div>
            <p className="gs-eyebrow">STAFF WORKSPACE</p>
            <h2>Business Portal</h2>
            <p>
              Manage shared inventory, record employee point-of-sale transactions, review access requests, and run ML demand analysis.
            </p>
            <ul className="entry-card__list">
              <li>
                <ShieldCheck size={16} aria-hidden="true" /> Role-based access for staff, clerks, and admins
              </li>
              <li>
                <BarChart3 size={16} aria-hidden="true" /> Reorder watch, supplier margins, and forecasting
              </li>
            </ul>
            <div className="entry-card__actions">
              <Link className="gs-btn gs-btn--secondary" href="/business">
                Open business portal <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="gs-text-link" href="/account">
                Sign in first <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
