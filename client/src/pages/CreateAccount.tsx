import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle } from "lucide-react";
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

export default function CreateAccount() {
  const { user, loading, signUp } = useCustomerAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const nextPath = sanitizeNextPath(params.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  if (!loading && user) {
    return <Redirect to={nextPath} replace />;
  }

  const signInHref = params.get("next")
    ? `/sign-in?next=${encodeURIComponent(nextPath)}`
    : "/sign-in";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      nextErrors.name = "Enter your full name.";
    }
    if (!email.trim() || !email.includes("@")) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (password.length < 6) {
      nextErrors.password = "Use at least 6 characters.";
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setFormError("");
    const result = await signUp({
      name,
      email,
      phone,
      password,
    });
    setBusy(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    if (result.requiresEmailConfirmation) {
      setVerificationPending(true);
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
            <Link href={signInHref} className="gs-btn gs-btn--secondary gs-btn--compact">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="page-width gs-auth-main">
        <div className="gs-auth-split">
          <section className="gs-auth-showcase" aria-labelledby="signup-showcase-title">
            <p className="gs-eyebrow">NEW CUSTOMER ACCOUNT</p>
            <h1 id="signup-showcase-title" className="gs-display-title">
              Set up once.
              <br />
              Order any time.
            </h1>
            <p className="gs-page-lead">
              Your Goodstock account keeps your contact details, delivery addresses, and hardware order history organized across every project.
            </p>

            <ol className="gs-benefit-list">
              <li className="gs-benefit-item">
                <span className="gs-benefit-item__num" aria-hidden="true">
                  01
                </span>
                <div>
                  <h2>Saved delivery details</h2>
                  <p>
                    Store your shipping address and contact phone once so checkout stays effortless.
                  </p>
                </div>
              </li>
              <li className="gs-benefit-item">
                <span className="gs-benefit-item__num" aria-hidden="true">
                  02
                </span>
                <div>
                  <h2>Complete order history</h2>
                  <p>
                    Review past fasteners, tools, and electrical parts to reorder exact specifications.
                  </p>
                </div>
              </li>
              <li className="gs-benefit-item">
                <span className="gs-benefit-item__num" aria-hidden="true">
                  03
                </span>
                <div>
                  <h2>Flexible device preferences</h2>
                  <p>
                    Customize Light, Dark, or System appearance across desktop, tablet, and mobile.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section className="gs-card gs-auth-panel" aria-labelledby="signup-heading">
            <div className="gs-auth-panel__header">
              <p className="gs-eyebrow">CREATE ACCOUNT</p>
              <h2 id="signup-heading">Create your account</h2>
              <p>Enter your details below to get started with Goodstock Hardware.</p>
            </div>

            {verificationPending ? (
              <div className="gs-auth-verified-state" role="status">
                <span className="gs-auth-verified-state__icon" aria-hidden="true">
                  <CheckCircle2 size={24} />
                </span>
                <h3>Check your email to confirm</h3>
                <p>
                  We sent a confirmation link to <strong>{email.trim()}</strong>. Confirm your email address, then sign in to enter Goodstock.
                </p>
                <Link href={signInHref} className="gs-btn gs-btn--primary gs-btn--full">
                  Go to sign in <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <>
                {formError && (
                  <InlineStatus
                    status="error"
                    title="Couldn’t create your account"
                    body={formError}
                  />
                )}

                <form className="gs-auth-form" noValidate onSubmit={handleSubmit}>
                  <TextField
                    id="signup-name"
                    label="Full name"
                    value={name}
                    autoComplete="name"
                    placeholder="Alex Morgan"
                    error={fieldErrors.name}
                    onChange={event => {
                      setName(event.target.value);
                      if (fieldErrors.name) {
                        setFieldErrors(prev => ({ ...prev, name: undefined }));
                      }
                    }}
                  />

                  <div className="gs-form-grid gs-form-grid--two">
                    <TextField
                      id="signup-email"
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

                    <TextField
                      id="signup-phone"
                      label="Phone (optional)"
                      type="tel"
                      value={phone}
                      autoComplete="tel"
                      placeholder="+63 917 123 4567"
                      onChange={event => setPhone(event.target.value)}
                    />
                  </div>

                  <div
                    className={`gs-field ${fieldErrors.password ? "gs-field--error" : ""}`.trim()}
                  >
                    <label htmlFor="signup-password" className="gs-field__label">
                      Password
                    </label>
                    <div className="gs-password-wrap">
                      <input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        aria-invalid={fieldErrors.password ? true : undefined}
                        aria-describedby={
                          fieldErrors.password
                            ? "signup-password-error"
                            : "signup-password-hint"
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
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword(current => !current)}
                      >
                        {showPassword ? (
                          <EyeOff size={18} aria-hidden="true" />
                        ) : (
                          <Eye size={18} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password ? (
                      <p id="signup-password-error" className="gs-field__error">
                        {fieldErrors.password}
                      </p>
                    ) : (
                      <p id="signup-password-hint" className="gs-field__hint">
                        Use 6 or more characters.
                      </p>
                    )}
                  </div>

                  <TextField
                    id="signup-confirm-password"
                    label="Confirm password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    error={fieldErrors.confirmPassword}
                    onChange={event => {
                      setConfirmPassword(event.target.value);
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors(prev => ({
                          ...prev,
                          confirmPassword: undefined,
                        }));
                      }
                    }}
                  />

                  <button
                    type="submit"
                    className="gs-btn gs-btn--primary gs-btn--full"
                    disabled={busy}
                  >
                    {busy ? (
                      <>
                        <LoaderCircle
                          size={17}
                          className="spin"
                          aria-hidden="true"
                        />
                        Creating account…
                      </>
                    ) : (
                      <>
                        Create account <ArrowRight size={17} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>

                <hr className="gs-divider" />

                <div className="gs-auth-switch">
                  <p>Already have a Goodstock account?</p>
                  <Link
                    href={signInHref}
                    className="gs-btn gs-btn--secondary gs-btn--full"
                  >
                    Sign in instead
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
