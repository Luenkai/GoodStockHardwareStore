# Goodstock Hardware Store

Goodstock combines the existing customer-facing hardware storefront with a separate staff business workspace. The storefront’s visual design and existing routes are retained; the staff workspace is available at `/business` and uses the same Goodstock palette and type system.

## Application areas

- **Storefront:** home, product search/filter/sort, product details, cart, account sign-in, demo order history, and cart/recent-order-based product suggestions.
- **Business workspace:** profile-name welcome; dashboard and recent activity; minimum/maximum inventory targets and suggested replenishment; point-of-sale with itemized, printable receipts; access requests and role review; and supplier-cost/markup management.
- **Roles:** `inventory_clerk` manages inventory; `sales_personnel` records sales; `admin` and `instructor` share inventory, sales, archive/restore and user/access administration. Supplier costs are private to admins/instructors. Instructors additionally train models and access evaluation metrics and dataset preview.
- **Knowledge analysis:** Admins and instructors can compare saved demand predictions. Instructors can train/version Simple Linear Regression and Random Forest models in Supabase and see held-out metrics and the dataset preview.

## Database and staff setup

Both application areas use the existing Supabase project and browser authentication. The business tables and security policies use **Supabase/PostgreSQL** (not MySQL). Sales are created through a PostgreSQL RPC that locks inventory rows, checks current prices and stock, creates the receipt and line items, and decrements stock in one transaction. Supabase row-level security protects staff roles, inventory writes, sales records, model artifacts, and evaluation metrics.

1. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` as described in `.env.example`.
2. Apply `supabase/schema.sql` to a new Supabase project. Apply `supabase/catalog_expansion.sql` if using the curated preview catalog.
   For existing catalog rows, run `supabase/update_product_images.sql` after the product rows exist; it changes only `image_url` and `image_alt` for the ten curated listings. Image sources, licenses, attributions, and product-match caveats are recorded in `data/product-image-credits.md`.
3. Apply `supabase/business-app.sql` to add staff roles, shared inventory metadata, atomic sales and receipts, model storage, access requests, private supplier-cost storage, role-checked RPCs and reversible product archive/restore.
4. For an existing project that already applied an earlier business schema, apply any missing earlier additive migrations (`supabase/archive_business_products.sql` and `supabase/dashboard_storefront_demo_orders.sql`) first, then apply `supabase/business_operations_features.sql`. That migration adds min/max stock, request review, instructor admin-equivalent permissions, protected supplier pricing and itemized receipt results. Fresh installs already receive these features from the current full schema.
5. Create the first admin through the existing Supabase Auth sign-up flow at `/account`. Then, in Supabase SQL Editor, replace the example email below with that account’s email and run it once:

   ```sql
   insert into public.business_staff (user_id, role)
   select id, 'admin' from auth.users
   where lower(email) = lower('admin@example.com')
   on conflict (user_id) do update set role = excluded.role, updated_at = now();
   ```

6. Sign in at `/account`, open `/business`, and use **User management** to assign roles to registered accounts or review workspace requests. A request never grants access by itself; an admin or instructor must approve and choose a role. Rejected users may resubmit. No Auth user or password is created by the business app.

Admins and instructors can maintain supplier name/cost separately from the public selling price; the workspace displays markup amount and percentage. Supplier costs remain outside `products` and are accessible only through role-checked functions. Inventory staff can configure minimum and maximum stock; the suggested top-up is `max_stock − current stock` and never adjusts inventory automatically. Receipts include item, quantity, unit price, line total, sale time and overall total, and completed receipts can be reopened and printed.

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

## Account and appearance

The site opens on a welcome gateway with sign-in/create-account and guest storefront options. Signed-in staff accounts are routed to `/business`; customers can browse the store and manage their name, phone, delivery address, and order history at `/account`. Use the sun/moon control in the header to switch between light and dark appearance; the preference is saved in the browser.
