# Plan: Atomic storefront sales, personalized recommendations, and safe product archiving

## Approved outcomes

1. Storefront demo purchases must be saved to Supabase and reflected in the business dashboard, sales history, and current inventory. The database must validate active products, current prices, stock, and quantities and record the order, line items, and inventory decrement atomically. Demo checkout collects no payment.
2. Show up to four active, available product recommendations in the cart based on products currently in the shopper's cart and their own recent purchases. Exclude products already in the cart or recent purchase set. Anonymous shoppers still receive cart-context suggestions; no other customer's order history is exposed.
3. Let administrators switch between active and archived inventory, archive an active product, and restore an archived product. Archiving changes only `products.is_active`; it must not delete the product or break historical order references. Archived products remain hidden from the public catalog.

## Implementation approach

- Replace the storefront's separate client-side order/order-item inserts with a PostgreSQL SECURITY DEFINER RPC. It authenticates the customer, validates and locks product inventory rows in stable order, calculates prices from the database, creates a completed demo order and line items, and decrements stock in the same transaction. Revoke direct customer inserts so forged totals/statuses cannot enter the dashboard.
- Keep storefront orders in `orders`/`order_items` for customer history and recommendations. Expose a role-checked RPC that combines staff sales and non-cancelled storefront demo orders for the sales table, and update the dashboard aggregate/recent activity to include both without double-counting or treating customers as employees. Refresh open staff views periodically so purchases appear without a manual route change.
- Keep the deterministic content-based recommender using product-category affinity: cart items receive a stronger weight than the shopper's recent purchases. Use the signed-in user's RLS-protected `orders`/`order_items` history, refresh suggestions after purchase, and do not claim a separately trained model.
- Retain the existing admin-only SECURITY DEFINER product archive/restore RPC and active/archive inventory filter; do not hard-delete products.
- Add an additive SQL migration for existing Supabase projects and keep `business-app.sql` complete for fresh installs. Document the exact SQL application order and runtime Supabase configuration requirements.
- Add deterministic tests for purchase/recommendation behavior, run type checks, tests, and a production build. Do not create test orders or mutate a shared Supabase database as part of verification.

## Project structure

- `client/src/pages/Cart.tsx`: submit a demo order through the new RPC and keep signed-in purchase history available for recommendations.
- `client/src/lib/recommendations.ts` and its test: deterministic category-affinity ranking using cart and recent purchases.
- `client/src/pages/BusinessPortal.tsx`: display unified staff/storefront sales and refresh open dashboard/inventory/sales views.
- `supabase/business-app.sql` and `supabase/storefront_demo_sales.sql`: secure order RPC, role-checked unified sales RPC, and dashboard aggregation.
- `README.md`, `LOCAL_SETUP.md`, and `TODO.md`: installation, migration, environment setup, and delivery status.

## Design

Keep the current Goodstock storefront's warm cream background, deep-green surfaces, rounded white product cards, compact typography, and existing mobile breakpoints. Place recommendations below the cart/order result using the existing product-card component. Keep archive controls restrained and adjacent to inventory management controls so they are discoverable without changing the dashboard layout. Keep transaction-origin labels subtle and consistent with the current staff workspace.
