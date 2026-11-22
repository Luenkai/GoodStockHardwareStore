// Only these public values may reach the browser. Never serialize process.env.
export function publicPlatformConfig(env: NodeJS.ProcessEnv = process.env) {
  const rawSupabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
  const supabaseUrl = rawSupabaseUrl
    ? (/^https?:\/\//i.test(rawSupabaseUrl) ? rawSupabaseUrl : `https://${rawSupabaseUrl}.supabase.co`).replace(/\/$/, "")
    : "";
  const explicitPublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.SUPABASE_PUBLISHABLE_KEY
    || env.SUPABASE_ANON_KEY
    || "";
  const legacyKey = env.SUPABASE_KEY ?? "";
  const supabasePublishableKey = explicitPublishableKey || (legacyKey.startsWith("sb_publishable_") ? legacyKey : "");
  return {
    projectId: env.MANUS_PROJECT_ID ?? "",
    oauthPortalUrl: env.MANUS_OAUTH_PORTAL_URL ?? "",
    apiUrl: env.MANUS_API_URL ?? "",
    apiBrowserKey: env.MANUS_API_BROWSER_KEY ?? "",
    supabaseUrl,
    supabasePublishableKey,
  };
}

export function publicPlatformScript(env: NodeJS.ProcessEnv = process.env): string {
  const json = JSON.stringify(publicPlatformConfig(env)).replaceAll("<", "\\u003c");
  return `window.__MANUS_CONFIG__=${json};`;
}
