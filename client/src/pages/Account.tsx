import { ArrowRight, Box, LoaderCircle, LogOut, MapPin, RotateCcw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import StoreLayout from "@/components/store/StoreLayout";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
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
            <h1>Orders, addresses, and account details. All in one place.</h1>
            {!supabase ? <p className="account-error" role="alert">Supabase is not configured in this deployment yet.</p> : loading ? <div className="skeleton account-skeleton" aria-busy="true" /> : user ? (
              <div className="account-session">
                <p>Signed in as <strong>{user.email}</strong>.</p>
                <p>Your profile and future project orders will be stored in Supabase.</p>
                <button type="button" className="button button--accent" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button>
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
            <p className="account-card__note">Demo account and profile data are handled by Supabase. No payment details are collected.</p>
          </div>
        </section>
        <section className="account-benefits" aria-label="Account features">
          <div><Box size={20} /><h2>Track orders</h2><p>See project order records in your account.</p></div>
          <div><MapPin size={20} /><h2>Manage addresses</h2><p>Keep delivery details ready for next time.</p></div>
          <div><RotateCcw size={20} /><h2>Recover access</h2><p>Use Supabase email recovery when enabled.</p></div>
        </section>
        <p className="account-back"><Link href="/products">Continue shopping</Link></p>
      </main>
    </StoreLayout>
  );
}
