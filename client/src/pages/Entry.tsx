import { ArrowRight, BarChart3, ShieldCheck, ShoppingBag, Store, Warehouse } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggleButton } from "@/components/store/GoodstockControls";

export default function Entry() {
  return (
    <main id="main-content" className="entry-page">
      <section className="entry-shell page-width" aria-labelledby="entry-title">
        <div className="entry-shell__inner">
          <div className="entry-topbar">
            <span className="gs-wordmark__name">goodstock</span>
            <ThemeToggleButton />
          </div>

          <header className="entry-hero">
            <p className="gs-eyebrow">GOODSTOCK HARDWARE PLATFORM</p>
            <h1 id="entry-title" className="gs-display-title">
              Choose where you want to work.
            </h1>
            <p className="entry-lead">
              Shop the Goodstock Hardware storefront or switch into the staff operations workspace for inventory, counter sales, and demand forecasting.
            </p>
          </header>

          <div className="entry-grid">
            <article className="gs-card entry-card">
              <div className="entry-card__icon" aria-hidden="true">
                <Store size={22} />
              </div>
              <p className="gs-eyebrow">ONLINE STOREFRONT</p>
              <h2>Shop Goodstock Hardware</h2>
              <p>
                Browse fasteners, hand tools, and electrical parts, manage your cart, and place orders for delivery or counter pickup.
              </p>
              <ul className="entry-card__list">
                <li>
                  <ShoppingBag size={16} aria-hidden="true" /> Complete hardware catalog &amp; live inventory
                </li>
              </ul>
              <div className="entry-card__actions">
                <Link className="gs-btn gs-btn--primary" href="/store">
                  Enter storefront <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link className="gs-text-link" href="/products">
                  Browse catalog
                </Link>
              </div>
            </article>

            <article className="gs-card entry-card entry-card--business">
              <div className="entry-card__icon" aria-hidden="true">
                <Warehouse size={22} />
              </div>
              <p className="gs-eyebrow">STAFF WORKSPACE</p>
              <h2>Business operations</h2>
              <p>
                Manage inventory levels, record point-of-sale counter receipts, monitor online orders, and run demand analytics.
              </p>
              <ul className="entry-card__list">
                <li>
                  <ShieldCheck size={16} aria-hidden="true" /> Role-based staff controls
                </li>
                <li>
                  <BarChart3 size={16} aria-hidden="true" /> Inventory, POS &amp; demand forecasting
                </li>
              </ul>
              <div className="entry-card__actions">
                <Link className="gs-btn gs-btn--secondary" href="/business">
                  Open workspace <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link className="gs-text-link" href="/account">
                  Account settings
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
