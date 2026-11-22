import { ArrowRight, ArrowUpRight, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import StoreLayout from "@/components/store/StoreLayout";
import CustomerProfile, {
  type CustomerProfileHandle,
} from "@/components/store/CustomerProfile";
import {
  AppearanceCard,
  InlineStatus,
  UnsavedChangesDialog,
} from "@/components/store/GoodstockControls";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import type { CustomerAddressDraft } from "@/lib/accountValidation";
import { formatMoney } from "@/lib/storefront";
import {
  fetchCustomerOrders,
  STORE_DATA_EVENT,
  type OrderRecord,
} from "@/lib/storeOperations";

const ACCOUNT_SECTIONS = [
  { id: "profile-delivery", label: "Profile & delivery" },
  { id: "recent-orders", label: "Order history" },
  { id: "appearance-settings", label: "Appearance" },
  { id: "account-access", label: "Account access" },
];

export default function Account() {
  const { user, signOut, refreshUser } = useCustomerAuth();
  const [, setLocation] = useLocation();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [preservedDraft, setPreservedDraft] = useState<{
    name: string;
    phone: string;
    address: CustomerAddressDraft;
  } | null>(null);
  const [activeNavSection, setActiveNavSection] = useState("profile-delivery");

  const profileRef = useRef<CustomerProfileHandle | null>(null);
  const signOutBtnRef = useRef<HTMLButtonElement | null>(null);

  const loadOrders = useCallback(async (userId: string) => {
    setOrdersLoading(true);
    setOrdersError("");
    const result = await fetchCustomerOrders(userId);
    setOrdersLoading(false);
    if (result.error) {
      setOrdersError(result.error);
      return;
    }
    setOrders(result.orders);
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadOrders(user.id);
    const sync = () => void loadOrders(user.id);
    window.addEventListener(STORE_DATA_EVENT, sync);
    return () => window.removeEventListener(STORE_DATA_EVENT, sync);
  }, [user, loadOrders]);

  const performSignOut = useCallback(async () => {
    setSigningOut(true);
    setSignOutError("");
    try {
      const result = await signOut();
      if (result.error) {
        setSigningOut(false);
        setSignOutError(
          result.error ||
            "Check your connection and try again. You’re still signed in.",
        );
        return;
      }
      setOrders([]);
      setOrdersError("");
      setHasUnsavedChanges(false);
      setPreservedDraft(null);
      setShowUnsavedDialog(false);
      setSigningOut(false);
      setLocation("/sign-in?signedOut=1", { replace: true });
    } catch {
      setSigningOut(false);
      setSignOutError(
        "Check your connection and try again. You’re still signed in.",
      );
    }
  }, [signOut, setLocation]);

  const requestSignOut = () => {
    if (signingOut) return;
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      return;
    }
    void performSignOut();
  };

  const handleSaveAndSignOut = async () => {
    if (!profileRef.current) return;
    setDialogBusy(true);
    const saved = await profileRef.current.saveChanges();
    setDialogBusy(false);
    if (!saved) {
      setShowUnsavedDialog(false);
      return;
    }
    setShowUnsavedDialog(false);
    await performSignOut();
  };

  const handleDiscardAndSignOut = async () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    await performSignOut();
  };

  if (!user) return null;

  const welcomeName =
    user.displayName.trim().split(/\s+/)[0] ||
    user.email.split("@")[0] ||
    "there";

  return (
    <>
      <StoreLayout>
        <main id="main-content" className="page-width gs-account-page">
          <div className="gs-signed-in">
            <header className="gs-account-header">
              <p className="gs-eyebrow">
                <Link href="/store">HOME</Link> / YOUR ACCOUNT
              </p>
              <h1 className="gs-page-title">Your account.</h1>
              <p className="gs-page-lead">
                Welcome back, {welcomeName}. Manage your contact details, default shipping address, and order history.
              </p>
            </header>

            <div className="gs-account-workspace">
              <aside className="gs-account-nav" aria-label="Account sections">
                <p className="gs-account-nav__eyebrow">MANAGE ACCOUNT</p>
                <nav className="gs-account-nav__list">
                  {ACCOUNT_SECTIONS.map(section => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={`gs-account-nav__link ${
                        activeNavSection === section.id ? "is-active" : ""
                      }`.trim()}
                      onClick={() => setActiveNavSection(section.id)}
                    >
                      {section.label}
                    </a>
                  ))}
                </nav>

                <div className="gs-account-nav__note">
                  <strong>Staff workspace</strong>
                  <p>
                    Authorized staff can switch to inventory, counter POS, and analytics.
                  </p>
                  <Link href="/business" className="gs-text-link">
                    Open workspace <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </aside>

              <CustomerProfile
                ref={profileRef}
                user={user}
                initialDraft={preservedDraft}
                onDirtyChange={setHasUnsavedChanges}
                onProfileSaved={() => void refreshUser()}
                onSessionExpired={draft => {
                  setPreservedDraft(draft);
                  setHasUnsavedChanges(false);
                  setLocation("/sign-in?next=%2Faccount");
                }}
              />

              <div className="gs-account-rail">
                <AppearanceCard id="appearance-settings" />

                <section
                  id="recent-orders"
                  className="gs-card gs-side-card"
                  aria-labelledby="recent-orders-title"
                >
                  <div className="gs-side-card__header">
                    <h2 id="recent-orders-title" className="gs-side-card__title">
                      Order history
                    </h2>
                    <p className="gs-side-card__subtitle">
                      {orders.length
                        ? `${orders.length} ${orders.length === 1 ? "order" : "orders"} placed`
                        : "Track your storefront purchases"}
                    </p>
                  </div>

                  {ordersLoading ? (
                    <p className="gs-side-card__subtitle" role="status">
                      Loading orders…
                    </p>
                  ) : ordersError ? (
                    <div className="gs-orders-error" role="alert">
                      <p>{ordersError}</p>
                      <button
                        type="button"
                        className="gs-btn gs-btn--secondary gs-btn--compact"
                        onClick={() => void loadOrders(user.id)}
                      >
                        <RefreshCw size={15} aria-hidden="true" /> Try again
                      </button>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="gs-orders-empty">
                      <p className="gs-side-card__subtitle">
                        You haven’t placed an order yet.
                      </p>
                      <Link href="/products" className="gs-text-link">
                        Browse hardware <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </div>
                  ) : (
                    <div className="gs-order-list">
                      {orders.slice(0, 6).map(order => (
                        <article className="gs-order-item" key={order.id}>
                          <div className="gs-order-item__top">
                            <div>
                              <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                              <span>
                                {new Date(order.created_at).toLocaleDateString()} ·{" "}
                                {order.status}
                              </span>
                            </div>
                            <strong className="price">
                              {formatMoney({
                                amount: String(order.total),
                                currencyCode: order.currency_code,
                              })}
                            </strong>
                          </div>
                          <ul className="gs-order-item__lines">
                            {order.order_items?.map(item => (
                              <li key={item.id}>
                                <span>
                                  {item.quantity} × {item.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section
                  id="account-access"
                  className="gs-card gs-side-card"
                  aria-labelledby="account-access-title"
                >
                  <div className="gs-side-card__header">
                    <h2 id="account-access-title" className="gs-side-card__title">
                      Account access
                    </h2>
                    <p className="gs-side-card__subtitle">
                      Signed in as <strong>{user.email}</strong>
                    </p>
                  </div>

                  {signingOut && (
                    <p className="sr-only" role="status" aria-live="polite">
                      Signing you out…
                    </p>
                  )}

                  {signOutError && (
                    <div className="gs-signout-error">
                      <InlineStatus
                        status="error"
                        title="Couldn’t sign you out"
                        body="Check your connection and try again. You’re still signed in."
                      />
                      <button
                        type="button"
                        className="gs-btn gs-btn--secondary gs-btn--full"
                        disabled={signingOut}
                        onClick={() => void performSignOut()}
                      >
                        Try signing out again
                      </button>
                    </div>
                  )}

                  <button
                    ref={signOutBtnRef}
                    type="button"
                    className="gs-btn gs-btn--secondary gs-btn--full"
                    disabled={signingOut}
                    onClick={requestSignOut}
                  >
                    {signingOut ? (
                      <>
                        <LoaderCircle
                          size={16}
                          className="spin"
                          aria-hidden="true"
                        />
                        Signing you out…
                      </>
                    ) : (
                      "Sign out"
                    )}
                  </button>

                  <p className="gs-side-card__meta">
                    You can sign back in any time on the sign-in screen.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </main>
      </StoreLayout>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        busy={dialogBusy}
        returnFocusRef={signOutBtnRef}
        onSaveAndSignOut={() => void handleSaveAndSignOut()}
        onDiscardAndSignOut={() => void handleDiscardAndSignOut()}
        onKeepEditing={() => setShowUnsavedDialog(false)}
      />
    </>
  );
}
