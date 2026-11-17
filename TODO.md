# TODO — Goodstock Hardware Store

## Implemented

- [x] Responsive storefront with home, product search/filter/sort, product details, availability, category navigation and local preview fallback.
- [x] Supabase-backed storefront catalog, authentication and demo checkout; no payment provider is connected.
- [x] Additive, full-height staff workspace at `/business`, styled with the existing Goodstock visual system.
- [x] Supabase-authenticated role-aware portal for inventory clerk, sales personnel, admin and instructor roles.
- [x] Shared inventory management with SKU and reorder level, low-stock indicators, and inventory reflected in storefront availability.
- [x] Atomic staff sale recording with database-validated prices and stock locks, receipts, line items and stock decrement.
- [x] Role management for existing Supabase accounts, with staff access enforced by RLS and checked database functions.
- [x] Dashboard cards, low-stock and recent transaction lists, and a recent-sales chart.
- [x] Simple Linear Regression and Random Forest Regression for demand prediction. Instructor-only training saves versioned JSON artifacts and evaluation metrics in Supabase; admins can predict from the saved models.
- [x] Held-out MAE, RMSE and R² metrics with descriptions; instructor-only model/dataset preview and CSV download.
- [x] Deterministic synthetic dataset in `data/demand-sales-1200.csv` with 1,200 monthly product rows, demand, price/promotion/seasonality features and sales revenue.
- [x] Added tests for dataset row count, model reproducibility, metrics and prediction values.
- [x] Admin-only profile shortcut to switch directly from the account page into business management.
- [x] Cart/recent-order product suggestions rank available active products, exclude cart and recent purchases, and read only the signed-in user's orders.
- [x] Admin-only reversible product archive and restore; archived products are hidden from the storefront and historical order references are retained.

## Setup or verification required

- [x] Apply and verify the product archive/restore RPC migration in the connected Supabase project.
- [x] Apply `supabase/business-app.sql` to the target Supabase project after `supabase/schema.sql`.
- [x] Bootstrap the first admin account with the SQL instructions in `README.md` / `LOCAL_SETUP.md`.
- [ ] Validate Supabase Auth redirect URLs, project settings and RLS policies against the deployment project.
- [ ] Walk through the deployed website with each staff role and verify login redirects and UI behavior.

## Remaining before real commerce

- [ ] Connect and test payment processing, refunds, receipts and order confirmation.
- [ ] Add verified merchant pricing, real inventory reconciliation and operational fulfillment.
- [ ] Add shipping/tax rules, support information and production incident workflows.
- [ ] Replace or rights-check original starter product photography and verify supplier specifications.

## Important

The CSV and model evaluation data are deterministic synthetic examples, not verified historic sales. Predictions and product-velocity labels are for demonstration and planning only, not guaranteed forecasts. Neither the storefront checkout nor business sales captures payment details.
