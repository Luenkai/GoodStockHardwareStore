import { ArrowRight, Eye, EyeOff, LoaderCircle, Package, ShieldCheck, Truck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Redirect, useLocation, useSearch } from "wouter";
import {
  InlineStatus,
  TextField,
  ThemeToggleButton,
} from "@/components/store/GoodstockControls";
import {
  sanitizeNextPath,
  useCustomerAuth,
} from "@/contexts/CustomerAuthContext";

export default function SignIn() {
  const { user, loading, signIn } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const nextPath = sanitizeNextPath(params.get("next"));
  const justSignedOut = params.get("signedOut") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSignedOutNotice, setShowSignedOutNotice] = useState(justSignedOut);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState("");

  if (!loading && user) {
    return <Redirect to={nextPath} replace />;
  }

  const createAccountHref = params.get("next")
    ? `/create-account?next=${encodeURIComponent(nextPath)}`
    : "/create-account";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim() || !email.includes("@")) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextErrors.password = "Enter your password.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setFormError("");
    setShowSignedOutNotice(false);

    const result = await signIn(email, password);
    setBusy(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setLocation(nextPath, { replace: true });
  };

  return (
    <div className="gs-auth-shell">
      <header className="gs-auth-topbar">
        <div className="page-width gs-auth-topbar__inner">
          <div className="gs-wordmark" aria-label="Goodstock Hardware">
            <span className="gs-wordmark__name">goodstock</span>
            <span className="gs-wordmark__sub">HARDWARE</span>
          </div>
          <div className="gs-auth-topbar__actions">
            <ThemeToggleButton />
            <Link href={createAccountHref} className="gs-btn gs-btn--secondary gs-btn--compact">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="page-width gs-auth-main">
        <div className="gs-auth-split">
          <section className="gs-auth-showcase" aria-labelledby="signin-showcase-title">
            <p className="gs-eyebrow">GOODSTOCK HARDWARE SUPPLY</p>
            <h1 id="signin-showcase-title" className="gs-display-title">
              Dependable hardware.
              <br />
              Ready when you are.
            </h1>
            <p className="gs-page-lead">
              Sign in to browse fasteners, hand tools, and electrical parts, manage saved delivery details, and track every order in one place.
            </p>

            <ul className="gs-auth-highlights">
              <li>
                <span className="gs-auth-highlights__icon" aria-hidden="true">
                  <Package size={18} />
                </span>
                <div>
                  <strong>Complete hardware catalog</strong>
                  <p>Search by part size, material, category, or brand with real-time stock status.</p>
                </div>
              </li>
              <li>
                <span className="gs-auth-highlights__icon" aria-hidden="true">
                  <Truck size={18} />
                </span>
                <div>
                  <strong>Streamlined fulfillment</strong>
                  <p>Save your delivery address once for fast nationwide shipping or counter pickup.</p>
                </div>
              </li>
              <li>
                <span className="gs-auth-highlights__icon" aria-hidden="true">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong>Unified customer &amp; staff access</strong>
                  <p>Authorized staff accounts can switch directly into inventory, POS, and analytics.</p>
                </div>
              </li>
            </ul>
          </section>

          <section className="gs-card gs-auth-panel" aria-labelledby="signin-heading">
            <div className="gs-auth-panel__header">
              <p className="gs-eyebrow">ACCOUNT SIGN IN</p>
              <h2 id="signin-heading">Welcome back</h2>
              <p>Sign in with your email and password to continue to Goodstock.</p>
            </div>

            {showSignedOutNotice && (
              <InlineStatus
                status="success"
                title="You’ve signed out"
                body="Your session has ended safely. Sign in below whenever you’re ready."
                onDismiss={() => setShowSignedOutNotice(false)}
              />
            )}

            {formError && (
              <InlineStatus
                status="error"
                title="Couldn’t sign you in"
                body={formError}
              />
            )}

            <form className="gs-auth-form" noValidate onSubmit={handleSubmit}>
              <TextField
                id="signin-email"
                label="Email address"
                type="email"
                value={email}
                autoComplete="email"
                placeholder="you@company.com"
                error={fieldErrors.email}
                onChange={event => {
                  setEmail(event.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }
                }}
              />

              <div
                className={`gs-field ${fieldErrors.password ? "gs-field--error" : ""}`.trim()}
              >
                <label htmlFor="signin-password" className="gs-field__label">
                  Password
                </label>
                <div className="gs-password-wrap">
                  <input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    aria-invalid={fieldErrors.password ? true : undefined}
                    aria-describedby={
                      fieldErrors.password ? "signin-password-error" : undefined
                    }
                    className="gs-field__input gs-field__input--with-toggle"
                    onChange={event => {
                      setPassword(event.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors(prev => ({
                          ...prev,
                          password: undefined,
                        }));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="gs-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(current => !current)}
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="signin-password-error" className="gs-field__error">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="gs-btn gs-btn--primary gs-btn--full"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <LoaderCircle size={17} className="spin" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to continue <ArrowRight size={17} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <hr className="gs-divider" />

            <div className="gs-auth-switch">
              <p>Don’t have a Goodstock account yet?</p>
              <Link
                href={createAccountHref}
                className="gs-btn gs-btn--secondary gs-btn--full"
              >
                Create an account
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
