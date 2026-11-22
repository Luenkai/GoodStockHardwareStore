# Plan: Goodstock business-app operations and access controls

## Approved outcomes

1. Welcome signed-in business users by their profile name; use a safe fallback when no display name exists.
2. Let a registered user request access to the business workspace without granting a role automatically. Let admins and instructors review pending requests and assign/reject access. Keep account passwords and Supabase Auth account creation inside the existing sign-up flow; staff roles apply only to existing accounts.
3. Give instructors the complete admin workspace, including inventory, sales, user/access management, and product archive/restore, while preserving the existing sales/inventory role boundaries for other roles.
4. Make point-of-sale receipts show the receipt number, sale time, each sold product, quantity, unit price, line total, and overall total; allow opening and printing completed receipts.
5. Maintain each product's supplier name and supplier cost separately from its public selling price. Calculate markup amount and percentage from those prices; restrict supplier-cost data and edits to admins/instructors and never expose it in storefront queries or public RPCs.
6. Preserve the existing model training, held-out testing, results, and evaluation metrics; make the Knowledge Analysis route available to instructors and admins.
7. Increase small business-app text to a readable size while preserving the Goodstock visual system and responsive layout.
8. Add per-product minimum and maximum stock levels. Keep the existing `reorder_level` field synchronized as a compatibility alias for the minimum. Alert at/below minimum and calculate suggested replenishment as `max_stock - current_stock` without silently changing stock.
9. Retain all existing storefront, recommendation, archive/restore, and demo-order dashboard behavior.

## Implementation approach

- Add additive Supabase migrations and mirror all durable schema/functions in `supabase/business-app.sql`. Use role-checked SECURITY DEFINER functions for approval decisions, staff-role administration, protected supplier costs, and receipt return data; retain RLS and column-level grants for inventory edits.
- Represent business-workspace requests separately from Supabase Auth accounts. A request can be created only by its signed-in owner; admins/instructors choose the actual staff role when approving. A rejected request can be resubmitted. Approval does not create credentials or approve storefront checkout/payment.
- Store supplier costs in a private business table, not on `products`, because storefront roles can read active product rows. Use a protected RPC to list/update costs and derive markup from supplier cost and public selling price.
- Add minimum/maximum stock fields with nonnegative and ordering constraints, backfill minimum from existing reorder levels and maximum to at least current stock, and keep `reorder_level` synchronized for existing clients.
- Return sale line items from the atomic sale RPC and let staff reopen/print stored receipts; do not alter sale totals or inventory locking behavior.
- Extend role checks and UI routing consistently for instructors; add first-name/profile-name greetings with metadata/email fallback. Raise dashboard, table, label, and mobile text sizes without shrinking touch targets.
- Preserve existing deterministic demand-model training, chronological 80/20 holdout, and evaluation results. Add focused tests for markup math, stock replenishment calculations, and receipt rendering/data mapping.

## Project structure

- `client/src/pages/BusinessPortal.tsx`: greeting, request/approval UI, instructor access, supplier pricing/markup, min/max stock, and printable receipts.
- `client/src/pages/Account.tsx`: name-aware welcome and account display.
- `client/src/lib/business-pricing.ts` and tests: deterministic markup and replenishment calculations.
- `client/src/index.css`: readable typography and responsive layout.
- `supabase/business-app.sql`: canonical full schema and role-checked RPCs.
- `supabase/business_operations_features.sql`: additive migration for access requests, instructor permissions, receipts, protected supplier costs, and stock ranges.
- `README.md`, `LOCAL_SETUP.md`, `plan.md`, and `TODO.md`: deployment guidance and outcome status.

## Design

Keep Goodstock's warm cream background, deep-green surfaces, rounded cards, and existing visual system. Prioritize clearer type hierarchy and readable labels over decorative changes. Put access requests in the current User management workflow; keep supplier cost visibly distinct from the customer-facing selling price; make receipt and replenishment actions explicit and auditable. Preserve mobile navigation, responsive tables, and large touch targets.
