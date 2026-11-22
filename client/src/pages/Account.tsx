import { ArrowRight, LoaderCircle, RefreshCw } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import StoreLayout from "@/components/store/StoreLayout";
import CustomerProfile, {
  type CustomerProfileHandle,
} from "@/components/store/CustomerProfile";
import {
  AppearanceCard,
  InlineStatus,
  TextField,
  UnsavedChangesDialog,
} from "@/components/store/GoodstockControls";
import type { CustomerAddressDraft } from "@/lib/accountValidation";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/storefront";
import type { User } from "@supabase/supabase-js";

type OrderRecord = {
  id: string;
  status: string;
  total: string;
  currency_code: string;
  created_at: string;
  order_items: { id: string; title: string; quantity: number; unit_price: string }[];
};

const SAMPLE_PREVIEW_USER = {
  id: "sample-preview-user",
  email: "alex@example.com",
  user_metadata: {
    display_name: "Alex Morgan",
    phone: "+63 917 123 4567",
  },
} as unknown as User;

const ACCOUNT_SECTIONS = [
  { id: "profile-delivery", label: "Profile & delivery" },
  { id: "recent-orders", label: "Orders" },
  { id: "appearance-settings", label: "Appearance" },
  { id: "account-access", label: "Account access" },
];

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [isSamplePreview, setIsSamplePreview] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFieldErrors, setAuthFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [authStatus, setAuthStatus] = useState<{
    kind: "error" | "info" | "success";
    title: string;
    body: string;
  } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  // Sign-out state, unsaved edits guard, and post-logout confirmation
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [signedOutBanner, setSignedOutBanner] = useState(false);
  const [preservedDraft, setPreservedDraft] = useState<{
    name: string;
    phone: string;
    address: CustomerAddressDraft;
  } | null>(null);
  const [activeNavSection, setActiveNavSection] = useState("profile-delivery");

  const profileRef = useRef<CustomerProfileHandle | null>(null);
  const signOutBtnRef = useRef<HTMLButtonElement | null>(null);
  const signedOutHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (event === "SIGNED_IN" && nextUser) {
        setSignedOutBanner(false);
        setSignOutError("");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadOrders = useCallback(async (targetUser: User | null) => {
    const client = supabase;
    if (!client || !targetUser) {
      setOrders([]);
      setOrdersError("");
      setOrdersLoading(false);
      return;
    }
    setOrdersLoading(true);
    setOrdersError("");
    const { data, error } = await client
      .from("orders")
      .select(
        "id,status,total,currency_code,created_at,order_items(id,title,quantity,unit_price)",
      )
      .eq("user_id", targetUser.id)
      .order("created_at", { ascending: false });
    setOrdersLoading(false);
    if (error) {
      setOrdersError(error.message || "Could not load your demo order history.");
      return;
    }
    setOrders((data ?? []) as OrderRecord[]);
  }, []);

  useEffect(() => {
    if (isSamplePreview) {
      setOrders([]);
      setOrdersError("");
      setOrdersLoading(false);
      return;
    }
    void loadOrders(user);
  }, [user, isSamplePreview, loadOrders]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldErrors: { name?: string; email?: string; password?: string } = {};
    if (authMode === "signup" && !authName.trim()) {
      fieldErrors.name = "Enter your full name.";
    }
    if (!authEmail.trim() || !authEmail.includes("@")) {
      fieldErrors.email = "Enter a valid email address.";
    }
    if (authPassword.length < 6) {
      fieldErrors.password = "Use at least 6 characters.";
    }
    setAuthFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    if (!supabase) {
      setAuthStatus({
        kind: "info",
        title: "Supabase auth is not configured in this preview",
        body: "Connect VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for live sign-in, or open the sample account preview below.",
      });
      return;
    }

    setAuthBusy(true);
    setAuthStatus(null);
    setSignedOutBanner(false);

    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: { data: { display_name: authName.trim() } },
      });
      setAuthBusy(false);
      if (error) {
        setAuthStatus({
          kind: "error",
          title: "Couldn’t create your account",
          body: error.message,
        });
        return;
      }
      setAuthPassword("");
      if (!data.session) {
        setAuthStatus({
          kind: "success",
          title: "Account created",
          body: "Check your email if confirmation is enabled, then sign in.",
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      setAuthBusy(false);
      if (error) {
        setAuthStatus({
          kind: "error",
          title: "Couldn’t sign you in",
          body: error.message,
        });
        return;
      }
      setAuthPassword("");
    }
  };

  const performSignOut = useCallback(async () => {
    setSigningOut(true);
    setSignOutError("");

    if (isSamplePreview) {
      await new Promise(resolve => window.setTimeout(resolve, 180));
      // Clear all private/sample account state before showing signed-out banner
      setIsSamplePreview(false);
      setOrders([]);
      setOrdersError("");
      setHasUnsavedChanges(false);
      setPreservedDraft(null);
      setShowUnsavedDialog(false);
      setSigningOut(false);
      setSignedOutBanner(true);
      window.setTimeout(() => signedOutHeadingRef.current?.focus(), 0);
      return;
    }

    if (!supabase) {
      setSigningOut(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Retain session and edits when sign-out fails
        setSigningOut(false);
        setSignOutError(
          error.message || "Check your connection and try again. You’re still signed in.",
        );
        return;
      }
      // Clear private account data before transitioning to signed-out state
      setUser(null);
      setOrders([]);
      setOrdersError("");
      setHasUnsavedChanges(false);
      setPreservedDraft(null);
      setShowUnsavedDialog(false);
      setSigningOut(false);
      setSignedOutBanner(true);
      window.setTimeout(() => signedOutHeadingRef.current?.focus(), 0);
    } catch {
      setSigningOut(false);
      setSignOutError("Check your connection and try again. You’re still signed in.");
    }
  }, [isSamplePreview]);

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

  const activeUser = isSamplePreview ? SAMPLE_PREVIEW_USER : user;
  const welcomeName = activeUser
    ? String(
        activeUser.user_metadata?.display_name ||
          activeUser.user_metadata?.full_name ||
          activeUser.email?.split("@")[0] ||
          "there",
      ).split(" ")[0]
    : "";

  return (
    <>
      <StoreLayout>
        <main id="main-content" className="page-width gs-account-page">
          {!activeUser ? (
            <div className="gs-signed-out">
              {signedOutBanner && (
                <InlineStatus
                  status="success"
                  title="You’re signed out."
                  body="Your account is secure. Sign in again whenever you’re ready."
                  onDismiss={() => setSignedOutBanner(false)}
                />
              )}

              {preservedDraft && (
                <InlineStatus
                  status="info"
                  title="Your unsaved edits are preserved"
                  body="Sign back in below to finish saving your profile and delivery address."
                />
              )}

              <div className="gs-signed-out__grid">
                <section
                  className="gs-account-benefits"
                  aria-labelledby="signed-out-title"
                >
                  <p className="gs-eyebrow">YOUR GOODSTOCK ACCOUNT</p>
                  <h1
                    id="signed-out-title"
                    ref={signedOutHeadingRef}
                    tabIndex={-1}
                    className="gs-display-title"
                  >
                    Less admin.
                    <br />
                    More making.
                  </h1>
                  <p className="gs-page-lead">
                    Save a delivery address, track demo orders, and return to the hardware without starting from scratch.
                  </p>

                  <ol className="gs-benefit-list">
                    <li className="gs-benefit-item">
                      <span className="gs-benefit-item__num" aria-hidden="true">
                        01
                      </span>
                      <div>
                        <h2>Order history</h2>
                        <p>
                          Keep a clear record of demo orders placed for each project.
                        </p>
                      </div>
                    </li>
                    <li className="gs-benefit-item">
                      <span className="gs-benefit-item__num" aria-hidden="true">
                        02
                      </span>
                      <div>
                        <h2>Simple checkout</h2>
                        <p>
                          Store your contact details and optional delivery address once.
                        </p>
                      </div>
                    </li>
                    <li className="gs-benefit-item">
                      <span className="gs-benefit-item__num" aria-hidden="true">
                        03
                      </span>
                      <div>
                        <h2>Payment-safe demo</h2>
                        <p>
                          No card numbers or billing details are ever collected.
                        </p>
                      </div>
                    </li>
                  </ol>
                </section>

                <section
                  className="gs-card gs-auth-card"
                  aria-labelledby="auth-card-heading"
                >
                  <div className="gs-auth-card__header">
                    <h2 id="auth-card-heading">
                      {authMode === "signin" ? "Welcome back." : "Create an account."}
                    </h2>
                    <p>
                      {authMode === "signin"
                        ? "Sign in to place demo orders and view your history."
                        : "Save your details for demo orders and project history."}
                    </p>
                  </div>

                  <form
                    className="gs-auth-form"
                    noValidate
                    onSubmit={handleAuthSubmit}
                  >
                    {authMode === "signup" && (
                      <TextField
                        id="auth-name"
                        label="Full name"
                        value={authName}
                        autoComplete="name"
                        placeholder="Alex Morgan"
                        error={authFieldErrors.name}
                        onChange={event => {
                          setAuthName(event.target.value);
                          setAuthFieldErrors(prev => ({ ...prev, name: undefined }));
                        }}
                      />
                    )}

                    <TextField
                      id="auth-email"
                      label="Email"
                      type="email"
                      value={authEmail}
                      autoComplete="email"
                      placeholder="you@example.com"
                      error={authFieldErrors.email}
                      onChange={event => {
                        setAuthEmail(event.target.value);
                        setAuthFieldErrors(prev => ({ ...prev, email: undefined }));
                      }}
                    />

                    <TextField
                      id="auth-password"
                      label="Password"
                      type="password"
                      value={authPassword}
                      autoComplete={
                        authMode === "signin" ? "current-password" : "new-password"
                      }
                      placeholder="At least 6 characters"
                      hint={
                        authMode === "signup"
                          ? "Use at least 6 characters."
                          : undefined
                      }
                      error={authFieldErrors.password}
                      onChange={event => {
                        setAuthPassword(event.target.value);
                        setAuthFieldErrors(prev => ({
                          ...prev,
                          password: undefined,
                        }));
                      }}
                    />

                    {authStatus && (
                      <InlineStatus
                        status={authStatus.kind}
                        title={authStatus.title}
                        body={authStatus.body}
                      />
                    )}

                    <button
                      type="submit"
                      className="gs-btn gs-btn--primary gs-btn--full"
                      disabled={authBusy}
                    >
                      {authBusy ? (
                        <>
                          <LoaderCircle
                            size={16}
                            className="spin"
                            aria-hidden="true"
                          />
                          {authMode === "signin"
                            ? "Signing in…"
                            : "Creating account…"}
                        </>
                      ) : authMode === "signin" ? (
                        "Sign in"
                      ) : (
                        "Create account"
                      )}
                    </button>
                  </form>

                  <hr className="gs-divider" />

                  <div className="gs-auth-switch">
                    <p>
                      {authMode === "signin"
                        ? "New to Goodstock?"
                        : "Already have an account?"}
                    </p>
                    <button
                      type="button"
                      className="gs-btn gs-btn--secondary gs-btn--full"
                      onClick={() => {
                        setAuthMode(mode =>
                          mode === "signin" ? "signup" : "signin",
                        );
                        setAuthFieldErrors({});
                        setAuthStatus(null);
                      }}
                    >
                      {authMode === "signin"
                        ? "Create an account"
                        : "Sign in instead"}
                    </button>
                  </div>

                  {!supabase && (
                    <div className="gs-preview-account-cta">
                      <p>
                        Running without Supabase credentials? Open the sample signed-in workspace to preview profile, delivery, appearance, and sign-out states.
                      </p>
                      <button
                        type="button"
                        className="gs-btn gs-btn--ghost gs-btn--full"
                        onClick={() => {
                          setSignedOutBanner(false);
                          setIsSamplePreview(true);
                        }}
                      >
                        Preview signed-in account
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div className="gs-signed-in">
              {isSamplePreview && (
                <InlineStatus
                  status="info"
                  title="Sample account preview"
                  body="Showing sample customer details because Supabase is not configured in this environment."
                />
              )}

              <header className="gs-account-header">
                <p className="gs-eyebrow">
                  <Link href="/store">HOME</Link> / YOUR ACCOUNT
                </p>
                <h1 className="gs-page-title">Your account.</h1>
                <p className="gs-page-lead">
                  Welcome back, {welcomeName}. Keep your details ready for the next project.
                </p>
              </header>

              <div className="gs-account-workspace">
                {/* Column 1: Account Navigation */}
                <aside
                  className="gs-account-nav"
                  aria-label="Account sections"
                >
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
                    <strong>Demo store</strong>
                    <p>
                      No payment details are collected or stored in this workspace.
                    </p>
                  </div>
                </aside>

                {/* Column 2: Profile & Delivery Form */}
                <CustomerProfile
                  ref={profileRef}
                  user={activeUser}
                  isSamplePreview={isSamplePreview}
                  initialDraft={preservedDraft}
                  onDirtyChange={setHasUnsavedChanges}
                  onSessionExpired={draft => {
                    setPreservedDraft(draft);
                    setUser(null);
                    setOrders([]);
                    setHasUnsavedChanges(false);
                  }}
                />

                {/* Column 3: Appearance, Orders, Account Access */}
                <div className="gs-account-rail">
                  <AppearanceCard id="appearance-settings" />

                  <section
                    id="recent-orders"
                    className="gs-card gs-side-card"
                    aria-labelledby="recent-orders-title"
                  >
                    <div className="gs-side-card__header">
                      <h2 id="recent-orders-title" className="gs-side-card__title">
                        Recent demo orders
                      </h2>
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
                          onClick={() => void loadOrders(activeUser)}
                        >
                          <RefreshCw size={15} aria-hidden="true" /> Try again
                        </button>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="gs-orders-empty">
                        <p className="gs-side-card__subtitle">
                          You haven’t placed a demo order yet.
                        </p>
                        <Link href="/products" className="gs-text-link">
                          Browse hardware <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    ) : (
                      <div className="gs-order-list">
                        {orders.slice(0, 4).map(order => (
                          <article className="gs-order-item" key={order.id}>
                            <div className="gs-order-item__top">
                              <div>
                                <strong>#{order.id.slice(0, 8)}</strong>
                                <span>
                                  {new Date(order.created_at).toLocaleDateString()}
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
                        Signed in as <strong>{activeUser.email}</strong>
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
                      You can sign back in any time.
                    </p>
                  </section>
                </div>
              </div>
            </div>
          )}
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
