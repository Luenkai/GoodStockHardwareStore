import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Address = { id?: string; recipient_name: string; label: string; line1: string; line2: string; city: string; region: string; postal_code: string; country: string; };
const emptyAddress: Address = { recipient_name: "", label: "Home", line1: "", line2: "", city: "", region: "", postal_code: "", country: "PH" };

export default function CustomerProfile({ user }: { user: User }) {
  const [name, setName] = useState(String(user.user_metadata?.display_name || user.user_metadata?.full_name || ""));
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void Promise.all([
      supabase.from("profiles").select("display_name,phone").eq("id", user.id).maybeSingle(),
      supabase.from("addresses").select("id,recipient_name,label,line1,line2,city,region,postal_code,country").eq("user_id", user.id).order("is_default", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([profile, saved]) => {
      if (!active) return;
      if (profile.data) { setName(profile.data.display_name || ""); setPhone(profile.data.phone || ""); }
      if (saved.data) setAddress({ ...emptyAddress, ...saved.data, line2: saved.data.line2 || "" });
    });
    return () => { active = false; };
  }, [user.id]);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setNotice("");
    const profileResult = await supabase.from("profiles").update({ display_name: name.trim(), phone: phone.trim(), updated_at: new Date().toISOString() }).eq("id", user.id);
    if (profileResult.error) { setNotice(`Profile could not be saved: ${profileResult.error.message}`); setBusy(false); return; }
    if (address.line1.trim() && address.city.trim() && address.postal_code.trim()) {
      const values = { ...address, user_id: user.id, is_default: true, line1: address.line1.trim(), city: address.city.trim(), postal_code: address.postal_code.trim() };
      const { id, ...payload } = values;
      const result = id ? await supabase.from("addresses").update(payload).eq("id", id).eq("user_id", user.id) : await supabase.from("addresses").insert(payload).select("id").single();
      if (result.error) setNotice(`Profile saved, but address could not be saved: ${result.error.message}`);
      else { if (!id && result.data) setAddress(current => ({ ...current, id: result.data.id })); setNotice("Your profile and delivery address are saved."); }
    } else setNotice("Your profile is saved. Add a street, city, and postal code to save a delivery address.");
    setBusy(false);
  };
  const field = (key: keyof Address, label: string, required = false) => <label key={key}>{label}<input value={address[key]} required={required} autoComplete={key === "recipient_name" ? "name" : key === "line1" ? "address-line1" : key === "line2" ? "address-line2" : key === "city" ? "address-level2" : key === "region" ? "address-level1" : key === "postal_code" ? "postal-code" : "country-name"} onChange={e => setAddress(current => ({ ...current, [key]: e.target.value }))} /></label>;
  return <section className="customer-profile" aria-labelledby="customer-profile-title"><h2 id="customer-profile-title">Your details</h2><p>Keep your contact information and delivery address ready for storefront orders.</p><form className="customer-profile__form" onSubmit={save}><label>Full name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required /></label><div className="customer-profile__field"><label>Email<input value={user.email || ""} readOnly aria-describedby="profile-email-hint" autoComplete="email" /></label><small id="profile-email-hint" className="customer-profile__hint">Email is linked to your sign-in.</small></div><label>Phone<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" /></label><h3>Delivery address</h3>{field("recipient_name", "Recipient name")}{field("line1", "Street address", true)}{field("line2", "Apartment, suite, unit (optional)")}{field("city", "City", true)}{field("region", "Province / region")}{field("postal_code", "Postal code", true)}{field("country", "Country / code")}<button className="button button--accent" type="submit" disabled={busy}>{busy ? "Saving…" : "Save my details"}</button>{notice && <p className="customer-profile__notice" role="status">{notice}</p>}</form></section>;
}
