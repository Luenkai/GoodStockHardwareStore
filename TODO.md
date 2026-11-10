# TODO — Goodstock Hardware Store

## Implemented

- [x] Responsive storefront with home, product search/filter/sort, product details, availability, category navigation, and a local preview fallback.
- [x] Supabase-backed active product catalog and authentication; no Shopify service integration.
- [x] Local-storage demo cart with quantity changes and removal; demo checkout creates Supabase order and line-item records without collecting payment.
- [x] Account sign-in/sign-up and recent demo-order history.
- [x] Curated hardware catalog expansion from a CC BY 4.0 MRO dataset; source IDs, attribution, product specifications, and demo-value caveats are documented in `data/qte-catalog-expansion.json` and `data/source-notes.md`.
- [x] Generic, original category illustrations for the added demo records.

## Remaining before real commerce

- [ ] Implement saved-address creation/editing/deletion and password-recovery flows in the account UI.
- [ ] Connect a payment provider and test order confirmation, refunds, and receipts.
- [ ] Add verified merchant pricing, real inventory and reservation/concurrency controls, fulfillment, shipping/tax rules, and operational support information.
- [ ] Replace or rights-check the original starter product photography; verify all supplier specifications before public sale.
- [ ] Validate deployment environment variables, Supabase Auth redirect URLs, and row-level security against the production project.

## Important

The current checkout is a demo that writes order data to Supabase only. It does not accept or collect payment and should not be represented as a live purchasing flow.
