# Plan: Personalized recommendations and safe product archiving

## Approved outcomes

1. Show up to four active, available product recommendations in the cart based on products currently in the shopper's cart and their own recent orders. Exclude products already in the cart or recent purchase set. Anonymous shoppers still receive cart-context suggestions; no other customer's order history is exposed.
2. Let administrators switch between active and archived inventory, archive an active product, and restore an archived product. Archiving changes only `products.is_active`; it must not delete the product or break historical order references. Archived products remain hidden from the public catalog.
3. Show valid storefront demo checkouts on the business overview as their own unpaid demo-order count, value grouped by currency, and latest six orders; exclude cancelled or itemless orders, keep them separate from employee-sales revenue, and do not expose them to inventory clerks.

## Implementation approach

- Add a small deterministic content-based recommender using product-category affinity: current cart items receive a stronger weight than products in the shopper's latest orders. Use the existing tRPC catalog query, `ProductCard`, cart hook, and Supabase RLS-protected `orders`/`order_items` reads. Label the feature as context-based recommendations rather than claiming a separately trained model.
- Add a single PostgreSQL SECURITY DEFINER RPC that checks for the `admin` staff role and toggles a product's existing `is_active` flag. The inventory UI will present an archived-only filter and an explicit restore action; it will not hard-delete products.
- Add a standalone additive SQL migration for the existing Supabase project, include the function in the full business-app schema for fresh installs, and document both migration paths.
- Add deterministic recommendation tests and verify archive access is enforced in PostgreSQL before enabling the client controls.
- Extend the existing role-checked dashboard RPC with a currency-grouped storefront-order summary and recent orders. Keep demo checkout amounts visibly unpaid and distinct from completed employee sales, and render them only for roles already allowed to view financial data.

## Project structure

- `client/src/pages/Cart.tsx`: load only the signed-in shopper's recent order product IDs and render recommendations.
- `client/src/lib/recommendations.ts` and its test: deterministic category-affinity ranking.
- `client/src/pages/BusinessPortal.tsx`: active/archive inventory filter and archive/restore actions.
- `supabase/business-app.sql`, `supabase/archive_business_products.sql`, and `supabase/dashboard_storefront_demo_orders.sql`: role-checked product activation RPC and dashboard aggregation; additive migrations update the existing Supabase project.
- `README.md`, `LOCAL_SETUP.md`, and `TODO.md`: installation and delivery status.

## Design

Keep the current Goodstock storefront's warm cream background, deep-green surfaces, rounded white product cards, compact typography, and existing mobile breakpoints. Place recommendations below the cart/order result using the existing product-card component. Keep archive controls restrained and adjacent to inventory management controls so they are discoverable without changing the dashboard layout.
