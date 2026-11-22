-- Add unpaid storefront demo orders to the staff overview without merging them
-- into completed employee-sale revenue.
create or replace function public.get_business_dashboard()
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare
  result jsonb;
  can_view_sales boolean;
begin
  if not public.has_business_role(array['inventory_clerk','sales_personnel','admin','instructor']) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  can_view_sales := public.has_business_role(array['sales_personnel','admin','instructor']);

  select jsonb_build_object(
    'product_count',(select count(*) from public.products where is_active),
    'low_stock_count',(select count(*) from public.products where is_active and inventory <= reorder_level),
    'stock_units',(select coalesce(sum(inventory),0) from public.products where is_active),
    'sales_count',case when can_view_sales then (select count(*) from public.business_sales where status='completed') else 0 end,
    'revenue',case when can_view_sales then (select coalesce(sum(total),0) from public.business_sales where status='completed') else 0 end,
    'low_stock',(select coalesce(jsonb_agg(x), '[]'::jsonb) from (select id,title,handle,inventory,reorder_level from public.products where is_active and inventory <= reorder_level order by inventory asc limit 6) x),
    'recent_sales',case when can_view_sales then (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select id,receipt_number,total,currency_code,status,created_at from public.business_sales order by created_at desc limit 6) x) else '[]'::jsonb end,
    'storefront_demo_order_count',case when can_view_sales then (select count(*) from public.orders o where o.status <> 'cancelled' and exists (select 1 from public.order_items i where i.order_id=o.id)) else 0 end,
    'storefront_demo_value_by_currency',case when can_view_sales then (select coalesce(jsonb_agg(jsonb_build_object('currency_code',x.currency_code,'total',x.total) order by x.currency_code), '[]'::jsonb) from (select o.currency_code,sum(o.total) as total from public.orders o where o.status <> 'cancelled' and exists (select 1 from public.order_items i where i.order_id=o.id) group by o.currency_code) x) else '[]'::jsonb end,
    'recent_storefront_demo_orders',case when can_view_sales then (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select o.id,o.status,o.total,o.currency_code,o.created_at from public.orders o where o.status <> 'cancelled' and exists (select 1 from public.order_items i where i.order_id=o.id) order by o.created_at desc limit 6) x) else '[]'::jsonb end
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_business_dashboard() from public, anon;
grant execute on function public.get_business_dashboard() to authenticated;
