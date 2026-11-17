-- Storefront demo checkout and unified staff/storefront reporting.
-- Apply after supabase/schema.sql and supabase/business-app.sql in an existing project.
-- Safe to rerun. Checkout writes are atomic and collect no payment details.

-- Customers must use the server-validated RPC instead of inserting prices/statuses directly.
drop policy if exists "Users can create own orders" on public.orders;
drop policy if exists "Users can create own order items" on public.order_items;
revoke insert on public.orders, public.order_items from anon, authenticated;

create or replace function public.create_storefront_demo_order(items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text := nullif(auth.jwt() ->> 'email', '');
  v_order_id uuid := gen_random_uuid();
  v_line record;
  v_product public.products%rowtype;
  v_total numeric(12, 2) := 0;
  v_currency text;
begin
  if v_user_id is null then
    raise exception 'Sign in to place a demo order' using errcode = '42501';
  end if;
  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'Order items must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(items) < 1 or jsonb_array_length(items) > 50 then
    raise exception 'Order must contain between 1 and 50 item lines' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(items) as entry(value)
    where jsonb_typeof(entry.value) is distinct from 'object'
       or coalesce(entry.value ->> 'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(entry.value ->> 'quantity', '') !~ '^[1-9][0-9]{0,1}$'
  ) then
    raise exception 'Each order line needs a valid product and quantity from 1 to 99' using errcode = '22023';
  end if;
  if exists (
    select 1
    from (
      select (entry.value ->> 'product_id')::uuid as product_id,
             sum((entry.value ->> 'quantity')::integer) as quantity
      from jsonb_array_elements(items) as entry(value)
      group by (entry.value ->> 'product_id')::uuid
    ) as grouped_items
    where grouped_items.quantity > 99
  ) then
    raise exception 'Combined quantity for a product cannot exceed 99' using errcode = '22023';
  end if;

  -- Lock all product rows in a stable order before validating or changing stock.
  for v_line in
    select (entry.value ->> 'product_id')::uuid as product_id,
           sum((entry.value ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(items) as entry(value)
    group by (entry.value ->> 'product_id')::uuid
    order by (entry.value ->> 'product_id')::uuid
  loop
    select * into v_product
    from public.products
    where id = v_line.product_id and is_active = true
    for update;
    if not found then
      raise exception 'A product in this order is no longer available' using errcode = 'P0002';
    end if;
    if v_product.inventory < v_line.quantity then
      raise exception 'Insufficient stock for %', v_product.title using errcode = '23514';
    end if;
    if v_currency is null then
      v_currency := v_product.currency_code;
    elsif v_currency <> v_product.currency_code then
      raise exception 'A demo order cannot mix currencies' using errcode = '22023';
    end if;
    v_total := v_total + round(v_product.price * v_line.quantity, 2);
  end loop;

  insert into public.orders (
    id, user_id, status, customer_email, total, currency_code
  ) values (
    v_order_id, v_user_id, 'completed', v_user_email, v_total, coalesce(v_currency, 'PHP')
  );

  for v_line in
    select (entry.value ->> 'product_id')::uuid as product_id,
           sum((entry.value ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(items) as entry(value)
    group by (entry.value ->> 'product_id')::uuid
    order by (entry.value ->> 'product_id')::uuid
  loop
    select * into v_product from public.products where id = v_line.product_id;
    update public.products
    set inventory = inventory - v_line.quantity, updated_at = now()
    where id = v_product.id;
    insert into public.order_items (
      order_id, product_id, title, quantity, unit_price, image_url
    ) values (
      v_order_id, v_product.id, v_product.title, v_line.quantity,
      v_product.price, v_product.image_url
    );
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'total', v_total,
    'currency_code', coalesce(v_currency, 'PHP'),
    'status', 'completed'
  );
end;
$$;
revoke all on function public.create_storefront_demo_order(jsonb) from public, anon;
grant execute on function public.create_storefront_demo_order(jsonb) to authenticated;

-- Staff can read a single, role-checked view of employee sales and customer demo orders.
create or replace function public.get_business_sales(p_limit integer default 100)
returns table (
  id uuid,
  receipt_number text,
  total numeric,
  currency_code text,
  status text,
  created_at timestamptz,
  source text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_business_role(array['sales_personnel', 'admin', 'instructor']) then
    raise exception 'Not authorized to view sales' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Sales limit must be between 1 and 500' using errcode = '22023';
  end if;

  return query
  select combined.id, combined.receipt_number, combined.total,
         combined.currency_code, combined.status, combined.created_at, combined.source
  from (
    select sale.id, sale.receipt_number, sale.total, sale.currency_code,
           sale.status, sale.created_at, 'staff'::text as source
    from public.business_sales as sale
    union all
    select customer_order.id,
           'WEB-' || upper(substr(replace(customer_order.id::text, '-', ''), 1, 10)) as receipt_number,
           customer_order.total, customer_order.currency_code, customer_order.status,
           customer_order.created_at, 'storefront'::text as source
    from public.orders as customer_order
    where customer_order.status <> 'cancelled'
      and exists (
        select 1 from public.order_items as item where item.order_id = customer_order.id
      )
  ) as combined
  order by combined.created_at desc
  limit p_limit;
end;
$$;
revoke all on function public.get_business_sales(integer) from public, anon;
grant execute on function public.get_business_sales(integer) to authenticated;

-- Dashboard sales/revenue include staff transactions and non-cancelled customer demo orders.
create or replace function public.get_business_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not public.has_business_role(array['inventory_clerk', 'sales_personnel', 'admin', 'instructor']) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'product_count', (select count(*) from public.products where is_active),
    'low_stock_count', (select count(*) from public.products where is_active and inventory <= reorder_level),
    'stock_units', (select coalesce(sum(inventory), 0) from public.products where is_active),
    'sales_count', case when public.has_business_role(array['sales_personnel', 'admin', 'instructor']) then
      (select count(*) from public.business_sales where status = 'completed') +
      (select count(*) from public.orders as customer_order
       where customer_order.status <> 'cancelled'
         and exists (select 1 from public.order_items as item where item.order_id = customer_order.id))
      else 0 end,
    'revenue', case when public.has_business_role(array['sales_personnel', 'admin', 'instructor']) then
      (select coalesce(sum(total), 0) from public.business_sales where status = 'completed') +
      (select coalesce(sum(customer_order.total), 0) from public.orders as customer_order
       where customer_order.status <> 'cancelled'
         and exists (select 1 from public.order_items as item where item.order_id = customer_order.id))
      else 0 end,
    'low_stock', (select coalesce(jsonb_agg(x), '[]'::jsonb)
      from (select id, title, handle, inventory, reorder_level
            from public.products where is_active and inventory <= reorder_level
            order by inventory asc limit 6) as x),
    'recent_sales', case when public.has_business_role(array['sales_personnel', 'admin', 'instructor']) then
      (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
       from (
         select combined.id, combined.receipt_number, combined.total,
                combined.currency_code, combined.status, combined.created_at, combined.source
         from (
           select sale.id, sale.receipt_number, sale.total, sale.currency_code,
                  sale.status, sale.created_at, 'staff'::text as source
           from public.business_sales as sale where sale.status = 'completed'
           union all
           select customer_order.id,
                  'WEB-' || upper(substr(replace(customer_order.id::text, '-', ''), 1, 10)) as receipt_number,
                  customer_order.total, customer_order.currency_code, customer_order.status,
                  customer_order.created_at, 'storefront'::text as source
           from public.orders as customer_order
           where customer_order.status <> 'cancelled'
             and exists (select 1 from public.order_items as item where item.order_id = customer_order.id)
         ) as combined
         order by combined.created_at desc limit 6
       ) as x)
      else '[]'::jsonb end
  ) into result;

  return result;
end;
$$;
revoke all on function public.get_business_dashboard() from public;
grant execute on function public.get_business_dashboard() to authenticated;
