# Goodstock Hardware Store — Local Setup

## Requirements

- Node.js 20 or newer and pnpm 10 or newer.
- A Supabase project for authentication, the product catalog, demo orders, staff roles, inventory, sales and saved analytics models.

## Configure and run

```bash
pnpm install
cp .env.example .env
# Set the Supabase project URL and publishable key in .env
pnpm dev
```

Open `http://localhost:3000`. The customer storefront is at `/`; the separate staff workspace is at `/business`.

The browser uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Server catalog reads use `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. `DATABASE_URL` is only a legacy optional variable for the starter's Manus session-user persistence; the store and business application use Supabase/PostgreSQL.

## Supabase schema and roles

1. Apply `supabase/schema.sql` in the Supabase SQL Editor. Apply `supabase/catalog_expansion.sql` when using its curated demo products.
2. Apply `supabase/business-app.sql`. This creates the business sales/model tables, shared inventory columns, security policies and role-checked database functions, including safe product archive/restore.
3. If the project already applied an earlier version of `business-app.sql`, apply `supabase/archive_business_products.sql` to add the admin-only archive/restore RPC. It is additive and safe to rerun; new installs already include it in `business-app.sql`.
4. Create an account at `/account`. To bootstrap the first admin, run the SQL below in the Supabase SQL Editor after replacing the example address with the account’s sign-in email:

   ```sql
   insert into public.business_staff (user_id, role)
   select id, 'admin' from auth.users
   where lower(email) = lower('admin@example.com')
   on conflict (user_id) do update set role = excluded.role, updated_at = now();
   ```

5. Sign in at `/account`, open `/business`, and add existing Supabase accounts with their business role through **User management**. Users must have registered before they can receive a staff role.

The available roles are inventory clerk, sales personnel, admin and instructor. Supabase RLS and checked RPC functions enforce access in the database; hiding a menu item is not the security boundary. No service-role key is needed or safe in the browser.

## Model data

The instructor analytics screen trains Simple Linear Regression and Random Forest Regression from `data/demand-sales-1200.csv` (1,200 synthetic records). Evaluation uses the first 960 records for training and the last 240 for a chronological holdout. Model artifacts and metrics are versioned in Supabase. Admins can request predictions from saved models; only instructors can access model training, the dataset preview/download and evaluation metrics. The dataset is illustrative and is not real sales history.

## Verify and build

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

The production build still includes the existing platform config script warning and can emit a large-chunk warning depending on build tooling. Business portal JavaScript is lazy-loaded separately so the storefront does not need to load the staff analytics code and CSV on its initial screen.

Both storefront checkout and business transactions are demo flows. Storefront orders do not collect payment details. Business transactions atomically validate stock and create internal receipts but do not collect payment. Do not accept real orders until payment processing, fulfillment, pricing, production access-control validation, inventory reconciliation, shipping/tax rules and operational support are in place.

## Netlify

`netlify.toml` publishes the React app from `dist/public` and routes `/api/*` to `netlify/functions/api.ts`. Configure the Supabase URL and publishable key for the client build, and the Supabase URL/publishable key for serverless functions. Apply the Supabase SQL files to the target project before enabling staff accounts. Never put a service-role key into a `VITE_` variable or commit secrets.
