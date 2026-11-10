# Goodstock Hardware Store — Local Setup

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer
- A Shopify store with Storefront API access if you want live products, cart, checkout, and customer accounts

## Install and run

```bash
pnpm install
cp .env.example .env
# Edit .env with your Shopify Storefront API values
pnpm dev
```

Open `http://localhost:3000`.

The storefront expects:

- `SHOPIFY_STORE_DOMAIN`: your `*.myshopify.com` domain
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`: a Storefront API token with product and cart access
- `PORT`: optional; defaults to `3000`
- `DATABASE_URL`: optional for the starter's managed-auth tables

Without Shopify values, the app still starts and displays its connection/loading states, but live products and checkout cannot load.

## Verify and build

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

Before accepting real orders, configure payment, shipping, tax, inventory, product imagery rights, and customer-account settings in Shopify Admin. The storefront sends customers to Shopify Checkout and does not collect card details itself.

## Deploy to Netlify

This project is Netlify-ready as a single site:

- React/Vite is the static frontend published from `dist/public`.
- `netlify/functions/api.ts` runs the Express/tRPC backend as a serverless function.
- `netlify.toml` routes `/api/*` to that function and sends all other paths to the React SPA.

Deploy with the Netlify CLI:

```bash
pnpm install
pnpm exec netlify login
pnpm exec netlify init
pnpm exec netlify deploy --build --prod
```

Or connect the repository in Netlify. Netlify will use the committed `netlify.toml` settings. Add `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN`, and any other required runtime values in **Netlify → Site configuration → Environment variables**. Never put real tokens in React files or commit them to Git.
