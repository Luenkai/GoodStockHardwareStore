import { ArrowRight, Box, ClipboardList, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import StoreLayout from "@/components/store/StoreLayout";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/storefront";
import type { User } from "@supabase/supabase-js";

type AccountOrder = {
  id: string;
  status: string;
  total: string | number;
  currency_code: string;
  created_at: string;
};

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data, error }) => {
      setUser(data.session?.user ?? null);
      if (error) setMessage(error.message);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      setOrders([]);
      setOrdersError("");
      return;
    }
    let active = true;
    setOrdersLoading(true);
    setOrdersError("");
    void supabase.from("orders")
      .select("id,status,total,currency_code,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!active) return;
        setOrders((data ?? []) as AccountOrder[]);
        setOrdersError(error?.message ?? "");
        setOrdersLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const result = mode === "sign-up"
      ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else setMessage(mode === "sign-up" ? "Account created. Check your email if confirmation is enabled." : "Signed in.");
  };

  const signOut = async () => { if (supabase) await supabase.auth.signOut(); };

  return (
    <StoreLayout>
      <main id="main-content" className="page-width account-page">
        <section className="account-card">
          <div className="account-card__visual" aria-hidden="true"><div className="account-card__orbit account-card__orbit--one" /><div className="account-card__orbit account-card__orbit--two" /><div className="account-card__icon"><Box size={34} strokeWidth={1.5} /></div></div>
          <div className="account-card__content">
            <p className="eyebrow">Your Goodstock account</p>
            <h1>Sign in to place demo orders and view your history.</h1>
            {!supabase ? <p className="account-error" role="alert">Supabase is not configured in this deployment yet.</p> : loading ? <div className="skeleton account-skeleton" aria-busy="true"><span className="sr-only" role="status" aria-live="polite">Checking your account…</span></div> : user ? (
              <div className="account-session">
                <p>Signed in as <strong>{user.email}</strong>.</p>
                <button type="button" className="button button--accent" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button>
                <section className="account-orders" aria-labelledby="account-orders-title">
                  <div className="account-orders__heading"><h2 id="account-orders-title">Recent demo orders</h2><span>Latest 10</span></div>
                  {ordersLoading ? <div className="skeleton account-orders__skeleton" aria-busy="true"><span className="sr-only" role="status" aria-live="polite">Loading order history…</span></div> : ordersError ? <p className="account-error" role="alert">Orders could not load. {ordersError}</p> : orders.length === 0 ? <p className="account-orders__empty">No demo orders yet. Your orders will appear here after checkout.</p> : (
                    <ul className="account-orders__list">
                      {orders.map(order => (
                        <li key={order.id} className="account-order">
                          <div><strong>Order {order.id.slice(0, 8)}</strong><span>{new Date(order.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })} · {order.status}</span></div>
                          <strong>{formatMoney({ amount: String(order.total), currencyCode: order.currency_code })}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : (
              <form className="account-form" onSubmit={submit}>
                {mode === "sign-up" && <label>Display name<input value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" required /></label>}
                <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></label>
                <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={6} required /></label>
                {message && <p className="account-error" role="alert">{message}</p>}
                <button className="button button--accent" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin" /> Working…</> : mode === "sign-up" ? <>Create account <ArrowRight size={18} /></> : <>Sign in <ArrowRight size={18} /></>}</button>
                <button type="button" className="quiet-link" onClick={() => { setMode(mode === "sign-up" ? "sign-in" : "sign-up"); setMessage(""); }}>{mode === "sign-up" ? "Already have an account? Sign in" : "Need an account? Create one"}</button>
              </form>
            )}
            <p className="account-card__note">Demo account data is handled by Supabase. No payment details are collected.</p>
          </div>
        </section>
        <section className="account-benefits" aria-label="Account features">
          <div><ClipboardList size={20} /><h2>Order history</h2><p>Review the ten most recent demo orders saved to your account.</p></div>
          <div><Box size={20} /><h2>Simple checkout</h2><p>Place a test order without collecting payment.</p></div>
          <div><ShieldCheck size={20} /><h2>Payment-safe demo</h2><p>The storefront does not collect or store card details.</p></div>
        </section>
        <p className="account-back"><Link href="/products">Continue shopping</Link></p>
      </main>
    </StoreLayout>
  );
}
