# Verified Figma handoff notes

Source: https://www.figma.com/design/hKgsXNgwpcH2n82HZW7Q1Z/Untitled?m=dev&t=mCXqYhTzOssu4w7R-1

The authenticated file exposes these named frames: Account · Light/Dark, Signed out · Dark, Goodstock Components & foundations, Account Mobile light/dark, States & anatomy, Review/handoff/usability guide, Storefront · Light/Dark, Admin overview · Light/Dark, Inventory · Light/Dark, Storefront · Mobile dark, Admin overview · Mobile light.

Design coverage from the handoff: desktop catalog with exact supplied product titles, six representative catalog assets, search, category controls, sort, and demo-data disclosure; admin overview with active products, total units, low-stock alerts, completed employee-sale revenue, replenishment watch, recent transactions, and separately identified unpaid storefront orders; inventory with active/low-stock filtering, min/max targets, suggested top-up, archive action, and admin-only supplier cost/markup example; mobile dark catalog and mobile light admin overview at 390px.

Shared appearance: retain the cream, forest-green, rust/orange family. Complete light/dark treatment for controls, labels, status text, charts, tooltips, tables, receipts, and print surfaces. Dark actions use light orange with dark text. Use visible focus states, 44px action targets, 48px fields, and 16px mobile input text.

Figma handoff data snapshot: 6 active products with stock 2, 12, 4, 10, 18, 3 = 49 total units; three at/below minimum 5; employee transactions PHP 2,760 + 3,690 + 2,490 = PHP 8,940; two unpaid storefront demo orders total PHP 1,994 and are excluded from employee-sale revenue.

Navigation issue found in source: BusinessPortal side/fallback links used href="/", which opens the entry gateway. Storefront route is /store and must be used for “Back to storefront” links.
