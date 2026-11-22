-- Apply only after the ten curated rows from catalog_expansion.sql exist.
-- Updates image_url and image_alt only; this script is separate and is not auto-run.
-- Image credits and license conditions: data/product-image-credits.md
begin;

update public.products as p
set image_url = images.image_url,
    image_alt = images.image_alt,
    updated_at = now()
from (values
  ('m12-stainless-steel-flat-washer-500-pack', '/images/m12-washer.webp', 'Illustrative photo of assorted washers; not verified as the KONOE M12 SUS304 500-pack.'),
  ('fujiwara-eps-500-torx-screwdriver-set', '/images/torx-screwdriver-set.webp', 'Illustrative Torx screwdriver and bit set; not verified as Fujiwara EPS-500.'),
  ('esco-ea560la-3-phillips-screwdriver', '/images/phillips-screwdriver.webp', 'Illustrative FACOM Phillips screwdriver; not the ESCO EA560LA-3 and its size is unverified.'),
  ('muratec-kds-ggr2575-tape-measure-7-5m', '/images/tape-measure.webp', 'Illustrative tape measure; not verified as MURATEC KDS GGR2575.'),
  ('three-peaks-giken-lr-125s-needle-nose-pliers', '/images/needle-nose-pliers.webp', 'Illustrative needle-nose pliers; brand and 125 mm size are not verified.'),
  ('kyoto-tool-ms2-07-combination-wrench-7mm', '/images/combination-wrenches.webp', 'Illustrative combination wrenches; not verified as the KYOTO TOOL 7 mm model.'),
  ('3m-pia220-polyimide-electrical-insulation-tape', '/images/polyimide-tape.webp', 'Illustrative polyimide tape; not verified as 3M PIA220.'),
  ('fuji-terminal-industry-glass-tube-fuse-250v-2a', '/images/glass-fuse.webp', 'Illustrative glass tube fuse; brand and electrical rating are not verified.'),
  ('omron-my2-mini-power-relay-ac-200-220v', '/images/omron-relay.webp', 'Illustrative photo of different Omron relay models; not the MY2 AC 200/220 model.'),
  ('idec-nrf11010a-circuit-breaker-10a', '/images/miniature-circuit-breaker.webp', 'Illustrative Entek miniature circuit breakers; not IDEC NRF11010A.')
) as images(handle, image_url, image_alt)
where p.handle = images.handle;

commit;
