# Hardware Store System

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

## Goodstock store operations

Shopify is the source of truth for the storefront catalog, inventory, cart, checkout, payment configuration, and orders. Manage products, stock, orders, and payment settings in Shopify Admin or the Shopify mobile app. The website sends customers to Shopify Checkout and never handles card details.

The configured connection is a new Shopify development store. Before real sales, claim the store, set up a payment provider, and review its shipping/tax settings in Shopify Admin. A development Preview does not prove live payments are enabled. Customer sign-in, account creation, order history, delivery addresses, and recovery use Shopify's hosted customer-account flow.

`data/hardware-seed.json` documents two starter records from the [Shopify Product Catalogue dataset](https://huggingface.co/datasets/Shopify/product-catalogue) (Apache-2.0). The public dataset lists about 48.3k multimodal product records and includes hardware examples; this shop imports only two. Source records do not provide verified retail prices or inventory quantities for these items, so the PHP prices and quantities are editable demo values, not source facts. Confirm the supplier, pack size, pricing, and stock before taking orders. Product images are representative web-search images; rights-check or replace them with merchant-owned photos before a public launch.

## Development

Run `pnpm dev` for the Express/tRPC storefront on port 3000. Use `pnpm check`, `pnpm test`, and `pnpm build` for the project's standard checks. The route manifest is served at `/manus-routes.json` from `client/public/manus-routes.json`.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

## Netlify deployment

The project can run as one Netlify site: React/Vite is published as static files, while `netlify/functions/api.ts` runs the Express/tRPC and Shopify backend as a serverless function. `netlify.toml` contains the build, API proxy, and SPA fallback rules. Add Shopify credentials as Netlify environment variables; never commit them to the frontend.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.
