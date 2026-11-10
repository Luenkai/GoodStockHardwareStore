# Storefront data and platform sources

## Product data

- **Shopify Product Catalogue dataset card:** https://huggingface.co/datasets/Shopify/product-catalogue
- **License and shape:** The dataset card reports Apache-2.0, approximately 48.3k rows overall (38.6k train, 9.66k test), and fields for product title, description, image, potential product categories, brand, secondhand flag, and ground-truth category.
- **Selected source records:** `PHILIP PN SMS Z 10X7/8` (Hillman Group, No. 10, zinc-plated, 7/8 in., pan head, Phillips, self-tapping sheet-metal screw; ground-truth category: Hardware > Hardware Accessories > Hardware Fasteners > Screws > Sheet Metal Screws) and `3pcs LM317 DC-DC Converter Buck Step Down Module Linear Regulator Adjustable Voltage Regulator Power Supply Board` (Electronic Pro; regulator specs are transcribed from its dataset description; potential category: Hardware > Power & Electrical Supplies > Voltage Transformers & Regulators > Voltage Regulators). The displayed sample rows have blank `product_image` cells, so separate representative image-search results were attached to the two Shopify listings.
- **Demo-only fields:** The dataset supplies no verified retail price or inventory quantity for these source records. The PHP prices and quantities in `data/hardware-seed.json` are explicitly editable starter values, not source facts. Verify pack quantity, supplier, manufacturer specifications, price, stock, and rights to images before accepting public orders.

## Shopify implementation references

- **Storefront Cart API:** https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart — the app uses Shopify's cart objects/operations and checkout URL rather than handling payment-card details.
- **Hosted customer accounts:** https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/customer-accounts and https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started — the storefront links to the Shopify-hosted `/account` page. The connected store's public page displays “Sign in” and “Sign in or create an account.” Customer Account API OAuth credentials and callbacks are not needed for this hosted page; a custom OAuth integration would require enabling/configuring that API in Shopify's Headless/Hydrogen channel.
- **Product media and create:** https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate — product creation accepts image media and returns newly created products unpublished by default, so storefront publication must be explicit.
- **Variant price and inventory tracking:** https://shopify.dev/docs/api/admin-graphql/latest/mutations/productVariantsBulkUpdate — the variant mutation supports setting price, SKU, tracking, and inventory policy, but `inventoryQuantities` is create-only for new variants.
- **Existing inventory adjustment:** https://shopify.dev/docs/api/admin-graphql/latest/mutations/inventoryAdjustQuantities — the seed uses this mutation to adjust stock with a zero-baseline `changeFromQuantity` check and the required `@idempotent` key for API version 2026-10.
- **Publication:** https://shopify.dev/docs/api/admin-graphql/latest/mutations/publishablePublish — the two active seed products were published only to the Shopify “Manus” channel used by this storefront.
