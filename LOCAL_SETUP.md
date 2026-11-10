# Goodstock Hardware Store — Local Setup

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer
- A Supabase project for live catalog, authentication, and demo-order storage

## Configure and run

```bash
pnpm install
cp .env.example .env
# Set the Supabase project URL and publishable/anon key in .env
pnpm dev
```

Open `http://localhost:3000`.

The application uses:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the browser for Supabase Auth.
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the server/API for public product reads.
- `PORT` optionally; the default is `3000`.
- `DATABASE_URL` optionally for the starter's separate managed-auth tables.

A project reference such as `your-project-ref` or a full `https://your-project-ref.supabase.co` URL is accepted by the server catalog loader. Use the full URL in the Vite client settings.

Without Supabase settings, the app starts with a local preview catalog. Preview listings are read-only and cannot be checked out. To set up a new Supabase database, review and apply `supabase/schema.sql` in the Supabase SQL Editor; it creates the demo catalog, profiles, addresses, orders, and order items with row-level security, plus the original starter products. Then apply `supabase/catalog_expansion.sql` to add the ten curated examples. That expansion uses `ON CONFLICT DO NOTHING`, so existing handles are not overwritten.

## Verify and build

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

Checkout is a demo flow: it saves order records in Supabase and does not collect payment. The current account page supports sign-in/sign-up and recent demo-order history; saved-address management and password-recovery UI are not implemented. Do not accept real orders until payment processing, fulfillment, shipping/tax rules, address management, inventory controls, support/contact details, and production security have been implemented and verified.

## Deploy to Netlify

This project is Netlify-ready as one site:

- React/Vite is published from `dist/public`.
- `netlify/functions/api.ts` runs the Express/tRPC API.
- `netlify.toml` routes `/api/*` to the function and sends other paths to the React SPA.

When connecting the repository in Netlify, configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` in the relevant build/runtime scopes. Never put a service-role key in frontend variables or commit private credentials.
