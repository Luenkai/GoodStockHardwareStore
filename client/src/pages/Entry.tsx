import { ArrowRight, Moon, Sun, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";

export default function Entry() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [checking, setChecking] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) { if (active) setChecking(false); return; }
      const { data: staff } = await supabase!.from("business_staff").select("role").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      if (staff?.role) setLocation("/business");
      else setLocation("/products");
    });
    return () => { active = false; };
  }, [setLocation]);

  return <main className="entry-page">
    <div className="entry-top"><img src="/brand-mark.svg" width="44" height="44" alt="" /><span>goodstock <small>hardware</small></span><button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button></div>
    <section className="entry-card">
      <div className="entry-mark"><Wrench size={28}/></div>
      <p className="eyebrow">Goodstock Hardware</p>
      <h1>Good tools.<br/><span>Clear choices.</span></h1>
      <p className="entry-copy">Sign in to see your account and orders, or continue into the storefront to browse hardware.</p>
      {checking ? <p role="status">Checking your session…</p> : <div className="entry-actions"><Link className="button button--accent" href="/account">Sign in or create account <ArrowRight size={18}/></Link><Link className="button button--dark" href="/products">Continue to storefront</Link></div>}
      <p className="entry-note">Staff accounts open directly in the business workspace after sign-in.</p>
    </section>
    <p className="entry-foot">Everyday hardware for the work ahead.</p>
  </main>;
}
