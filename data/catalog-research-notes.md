# Catalog dataset research

Reviewed 2026-11-10 for GoodStock Hardware's demo catalog.

## Candidate selected for a curated demo subset

- **QTE Technologies Industrial & Scientific Product Catalog (Version 7)**, Mendeley Data: https://data.mendeley.com/datasets/hr2ysn26ys/7
- Dataset page lists **CC BY 4.0**, a 62.6 MB downloadable archive, and describes product titles, descriptions/specifications, identifiers, brands, source links, image links, price, and availability fields. The archive contains several dated snapshots; the latest English file is `product-E-20-09-2026.csv`.
- The latest English snapshot contains 36,016 rows. It includes identifiable hardware-related entries such as stainless-steel washers, screwdrivers, pliers, measuring tapes, electrical insulation tape, fuses, relays, and circuit breakers. The catalog is industrial/MRO and contains substantial laboratory equipment, so use a curated subset only.
- Dataset citation shown on the source page: Nguyen Huu, Tuan (2026), “QTE Technologies Industrial & Scientific Product Catalog (1M+ Items) - Multilingual Dataset”, Mendeley Data, V7, DOI 10.17632/hr2ysn26ys.7.
- Use the selected product metadata with attribution. Do **not** reuse the dataset's `price` or stock fields: the CSV does not state a currency and the listed availability is largely `preorder`. Do not reuse linked supplier images without separate rights clearance. Any PHP prices and quantities in GoodStock are demo values and must be labeled as such.

## Candidates rejected

- **Shopify/product-catalogue**, Hugging Face: https://huggingface.co/datasets/Shopify/product-catalogue. The dataset card lists Apache-2.0 and approximately 48.3k records, but its repository contains many multimodal Parquet files totaling about 9.5 GB. It is unnecessarily large for this small storefront.
- **Product Catalogue**, Database Sample: https://databasesample.com/datasets/product-catalogue. The page labels it CC0 and offers 100 product rows in a ~3 KB CSV, but inspection shows synthetic, nonsensical item names (for example, “MacBook mattress drone”); it is unsuitable as a real-looking product list.
- **eCommerce-dataset-samples**, GitHub: https://github.com/luminati-io/eCommerce-dataset-samples. The repository describes products collected via Bright Data from marketplaces but does not show an explicit dataset reuse license. Avoid importing scraped listings into the public store.
