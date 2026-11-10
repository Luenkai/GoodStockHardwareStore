import { createClient } from "@supabase/supabase-js";

const runtimeConfig = typeof window === "undefined" ? undefined : window.__MANUS_CONFIG__;
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || runtimeConfig?.supabaseUrl;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || runtimeConfig?.supabasePublishableKey;

export const supabase = url && key ? createClient(url, key) : null;
