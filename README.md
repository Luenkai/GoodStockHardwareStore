# Goodstock Hardware Store

A React/Vite storefront with an Express/tRPC API, Supabase-backed product catalog and authentication, and a demo checkout that stores order records without collecting payment.

## Commands

- `pnpm dev`: development server on port 3000 by default.
- `pnpm check`: TypeScript and project checks.
- `pnpm test`: application tests.
- `pnpm build` / `pnpm start`: build and serve the site.

## Store data and checkout

Supabase is the source of truth for active product rows, customer authentication, and demo orders. The browser cart is stored locally and checkout writes order and line-item records to Supabase. No payment provider is connected and the app does not collect card details; do not use it to accept real orders.

If Supabase is not configured, the storefront serves a non-purchasable local preview catalog. If Supabase is configured but a curated addition has not yet been seeded, it also appears as a non-purchasable preview until `supabase/catalog_expansion.sql` is applied. The initial records are documented in `data/hardware-seed.json`; the curated hardware additions and their attribution are in `data/qte-catalog-expansion.json` and `data/source-notes.md`. Prices and quantities marked as demo values are illustrative, not supplier quotes or verified inventory.

## Supabase setup

1. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` as described in `.env.example`.
2. Apply `supabase/schema.sql` to a new Supabase project to create the demo tables and original starter products.
3. Apply `supabase/catalog_expansion.sql` to add the ten curated hardware examples. It is idempotent and leaves existing handles unchanged. Review demo prices and stock before using it.
4. Enable email authentication and set the public site URL in Supabase Auth settings.
5. For deployments, set the same public URL and publishable key in both the client build environment and the serverless function environment. Never put a service-role key in client code.

## Netlify

`netlify.toml` publishes the static React app and routes `/api/*` to `netlify/functions/api.ts`. Connect the repository to Netlify and set the Supabase environment variables in the site settings. Product data, account state, and demo orders remain in Supabase.
