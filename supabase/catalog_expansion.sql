-- Curated product metadata from the QTE Mendeley Data Version 7 English snapshot.
-- CC BY 4.0 attribution and source record URLs are in data/source-notes.md and data/qte-catalog-expansion.json.
-- Prices and inventory below are illustrative Goodstock demo values, not source prices or verified stock.
insert into public.products (title, handle, description, product_type, vendor, price, currency_code, inventory, image_url, image_alt, is_active)
values
  (
    'KONOE W-SUS-0012 Stainless-Steel Flat Washer, M12, 500-Pack',
    'm12-stainless-steel-flat-washer-500-pack',
    $qte$SUS304 stainless-steel flat washers for M12 fasteners.
Nominal diameter: M12
Material: SUS304 stainless steel
Pack: 500 pieces
Source model: WSUS0012
Demo listing; verify pack and specifications before real sale.$qte$,
    'Fasteners', 'KONOE', 149.00, 'PHP', 12,
    '/images/m12-washer.webp', 'Illustrative photo of assorted washers; not verified as the KONOE M12 SUS304 500-pack.', true
  ),
  (
    'Fujiwara Sangyo EPS-500 Precision Torx Screwdriver Set',
    'fujiwara-eps-500-torx-screwdriver-set',
    $qte$Precision Torx screwdriver set for small fasteners and electronics work.
Tips: T2, T3, T4, T5, T6, and T8
Tip length: 25 mm each
Source model: EPS-500
Demo listing; verify set contents before real sale.$qte$,
    'Tools', 'Fujiwara Sangyo', 399.00, 'PHP', 8,
    '/images/torx-screwdriver-set.webp', 'Illustrative Torx screwdriver and bit set; not verified as Fujiwara EPS-500.', true
  ),
  (
    'ESCO EA560LA-3 Phillips Screwdriver, #3 × 150 mm',
    'esco-ea560la-3-phillips-screwdriver',
    $qte$Phillips screwdriver with a #3 tip and 150 mm shaft.
Tip: Phillips #3
Shaft length: 150 mm
Shaft diameter: 8 mm per source listing
Source model: EA560LA-3
Demo listing; verify specifications before real sale.$qte$,
    'Tools', 'ESCO', 179.00, 'PHP', 15,
    '/images/phillips-screwdriver.webp', 'Illustrative FACOM Phillips screwdriver; not the ESCO EA560LA-3 and its size is unverified.', true
  ),
  (
    'MURATEC KDS GGR2575 Tape Measure, 7.5 m × 25 mm',
    'muratec-kds-ggr2575-tape-measure-7-5m',
    $qte$Metric tape measure for general measuring tasks.
Length: 7.5 m
Width: 25 mm
Scale: JIS Class 1, double-sided metric
Features: lock, belt hook, and shock absorber
Demo listing; verify specifications before real sale.$qte$,
    'Tools', 'MURATEC KDS', 399.00, 'PHP', 10,
    '/images/tape-measure.webp', 'Illustrative tape measure; not verified as MURATEC KDS GGR2575.', true
  ),
  (
    'THREE PEAKS GIKEN LR-125S Needle-Nose Pliers, 125 mm',
    'three-peaks-giken-lr-125s-needle-nose-pliers',
    $qte$125 mm needle-nose pliers with a chrome-vanadium steel body and elastomer grips.
Length: 125 mm
Weight: 83 g
Cut capacity per source listing: steel wire 1.5 mm; copper wire 2.6 mm
Source model: LR-125S
Demo listing; verify specifications before real sale.$qte$,
    'Tools', 'THREE PEAKS GIKEN', 299.00, 'PHP', 8,
    '/images/needle-nose-pliers.webp', 'Illustrative needle-nose pliers; brand and 125 mm size are not verified.', true
  ),
  (
    'KYOTO TOOL MS2-07 Combination Wrench, 7 mm',
    'kyoto-tool-ms2-07-combination-wrench-7mm',
    $qte$Compact 7 mm combination wrench for general fastening work.
Size: 7 mm
Length: 111 mm
Weight: 20 g
Source model: MS2-07
Demo listing; verify specifications before real sale.$qte$,
    'Tools', 'KYOTO TOOL', 199.00, 'PHP', 12,
    '/images/combination-wrenches.webp', 'Illustrative combination wrenches; not verified as the KYOTO TOOL 7 mm model.', true
  ),
  (
    '3M PIA220 Polyimide Electrical Insulation Tape, 9 mm × 33 m',
    '3m-pia220-polyimide-electrical-insulation-tape',
    $qte$High-temperature polyimide insulation tape for coils, transformers, and capacitors.
Width: 9 mm
Length: 33 m
Thickness: 0.05 mm
Temperature rating: 220 °C per source listing; verify manufacturer datasheet
Demo listing; confirm specifications and electrical suitability before real sale.$qte$,
    'Power & Electrical', '3M', 249.00, 'PHP', 10,
    '/images/polyimide-tape.webp', 'Illustrative polyimide tape; not verified as 3M PIA220.', true
  ),
  (
    'FUJI TERMINAL INDUSTRY Glass Tube Fuse, 250 V, 2 A',
    'fuji-terminal-industry-glass-tube-fuse-250v-2a',
    $qte$Glass tube fuse for compatible electrical equipment. Check the device's specified rating before installation.
Voltage: AC 250 V
Current: 2 A
Size: 6.4 x 30 mm
Contacts: brass, nickel-plated per source listing
Demo listing; verify electrical specifications and compatibility before use.$qte$,
    'Power & Electrical', 'FUJI TERMINAL INDUSTRY', 39.00, 'PHP', 30,
    '/images/glass-fuse.webp', 'Illustrative glass tube fuse; brand and electrical rating are not verified.', true
  ),
  (
    'OMRON MY2 Mini Power Relay, AC 200/220 V',
    'omron-my2-mini-power-relay-ac-200-220v',
    $qte$Mini power relay for compatible control equipment; confirm coil and contact ratings before installation.
Rated coil voltage: AC 200/220 V
Series: MY2 standard type
Contact material: gold plating and silver per source listing
Demo listing; verify wiring, datasheet, and compatibility before use.$qte$,
    'Power & Electrical', 'OMRON', 349.00, 'PHP', 8,
    '/images/omron-relay.webp', 'Illustrative photo of different Omron relay models; not the MY2 AC 200/220 model.', true
  ),
  (
    'IDEC NRF11010A Circuit Breaker, 10 A',
    'idec-nrf11010a-circuit-breaker-10a',
    $qte$10 A circuit breaker for compatible electrical panels; installation and compatibility should be checked by a qualified person.
Rated current: 10 A
Terminal type: model 250 per source listing
Source model: NRF11010A
Demo listing; verify electrical specifications and compatibility before use.$qte$,
    'Power & Electrical', 'IDEC', 499.00, 'PHP', 6,
    '/images/miniature-circuit-breaker.webp', 'Illustrative Entek miniature circuit breakers; not IDEC NRF11010A.', true
  )
on conflict (handle) do nothing;
