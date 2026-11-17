# Goodstock Hardware Store

Goodstock combines the existing customer-facing hardware storefront with a separate staff business workspace. The storefront’s visual design and existing routes are retained; the staff workspace is available at `/business` and uses the same Goodstock palette and type system.

## Application areas

- **Storefront:** home, product search/filter/sort, product details, cart, account sign-in, demo order history, and cart/recent-order-based product suggestions.
- **Business workspace:** dashboard cards and recent-sales chart; shared inventory management with reversible product archiving; sales transactions; role management; and demand/sales predictions.
- **Roles:** `inventory_clerk` manages inventory; `sales_personnel` records sales; `admin` has dashboard, inventory, sales, staff-role and prediction access; `instructor` has dashboard and knowledge-analysis access, including model training, metrics, and dataset preview.
- **Knowledge analysis:** Simple Linear Regression and Random Forest Regression. Instructors can train and version model artifacts in Supabase. Administrators can load saved artifacts and see predictions, but not the evaluation-metric or dataset screens.

## Database and staff setup

Both application areas use the existing Supabase project and browser authentication. The business tables and security policies use **Supabase/PostgreSQL** (not MySQL). Sales are created through a PostgreSQL RPC that locks inventory rows, checks current prices and stock, creates the receipt and line items, and decrements stock in one transaction. Supabase row-level security protects staff roles, inventory writes, sales records, model artifacts, and evaluation metrics.

1. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` as described in `.env.example`.
2. Apply `supabase/schema.sql` to a new Supabase project. Apply `supabase/catalog_expansion.sql` if using the curated preview catalog.
3. Apply `supabase/business-app.sql` to add staff roles, shared inventory metadata, atomic business sales, model storage and role-checked RPCs, including the reversible product archive function.
4. Existing projects that already applied an earlier `business-app.sql` should apply `supabase/archive_business_products.sql` to add the archive/restore RPC. The additive migration is safe to rerun; fresh installs already receive the function from the full business schema.
5. Create the first admin through the existing Supabase Auth sign-up flow at `/account`. Then, in Supabase SQL Editor, replace the example email below with that account’s email and run it once:

   ```sql
   insert into public.business_staff (user_id, role)
   select id, 'admin' from auth.users
   where lower(email) = lower('admin@example.com')
   on conflict (user_id) do update set role = excluded.role, updated_at = now();
   ```

6. Sign in at `/account`, open `/business`, and use **User management** to assign roles to other existing Supabase accounts. A staff member must first register through the current account screen.

Never expose a Supabase service-role key in browser code. The business portal uses the publishable key and relies on database RLS and checked RPC functions for authorization. The initial administrator bootstrap is intentionally a manual SQL operation so the migration cannot silently grant privileged access to an account.

## Dataset and models

`data/demand-sales-1200.csv` contains 1,200 deterministic synthetic monthly product records for 10 product categories, with price, promotion, seasonality, previous demand, demand units, and sales revenue. It is an instructional/demo dataset, not verified historical Goodstock sales. The analytics workflow uses a chronological 80/20 split (960 training rows and 240 held-out rows).

- **Simple Linear Regression** fits previous-month demand as its single predictor.
- **Random Forest Regression** averages 20 randomized regression trees using price, promotion, seasonality and previous-month demand.
- **MAE**, **RMSE**, and **R²** are evaluated on held-out records. Their descriptions appear beside the instructor metrics.
- Saved JSON model artifacts and versioned evaluation metrics are stored in Supabase. Prediction output includes forecast demand, expected sales value, and a velocity label derived from synthetic-dataset demand quartiles.

Run `pnpm test` to validate dataset row count, model reproducibility, and prediction metrics.

## Commands

- `pnpm dev`: development server on port 3000 by default.
- `pnpm check`: TypeScript and project checks.
- `pnpm test`: application and analytics tests.
- `pnpm build` / `pnpm start`: build and serve the site.

## Demo commerce and production cautions

The customer storefront checkout remains a demo that stores Supabase order records without collecting payment. Business sales are also internal demo transactions and do not collect payment details. Before real commerce, add payment processing and refunds, verified merchant prices and inventory, fulfillment, shipping/tax rules, production auth redirect validation, operational support, and production row-level-security testing. Product images/specifications and all demo values still require rights and supplier verification.

## Netlify

`netlify.toml` publishes the React app and routes `/api/*` to the serverless API. Configure the Supabase URL and publishable key in the build environment and the Supabase URL/key in the function environment. The browser receives only the publishable key; never configure a service-role key as a `VITE_` variable.
