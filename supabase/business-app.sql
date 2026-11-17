-- Business application extension for the existing Supabase project.
-- Apply after supabase/schema.sql. All privileged writes validate staff roles in PostgreSQL.

alter table public.products add column if not exists sku text;
alter table public.products add column if not exists reorder_level integer not null default 5 check (reorder_level >= 0);
update public.products set sku = 'GS-' || upper(substr(replace(id::text, '-', ''), 1, 10)) where sku is null;
alter table public.products alter column sku set not null;
create unique index if not exists products_sku_unique_idx on public.products(sku);

create table if not exists public.business_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('inventory_clerk','sales_personnel','admin','instructor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.business_sales (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  employee_user_id uuid not null references auth.users(id),
  status text not null default 'completed' check (status in ('completed','voided')),
  total numeric(12,2) not null check (total >= 0),
  currency_code text not null default 'PHP',
  created_at timestamptz not null default now()
);
create table if not exists public.business_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.business_sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_title text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create table if not exists public.business_models (
  id bigint generated always as identity primary key,
  model_type text not null check (model_type in ('linear_regression','random_forest')),
  version integer not null check (version > 0),
  artifact jsonb not null,
  metrics jsonb not null,
  trained_at timestamptz not null default now(),
  unique(model_type,version)
);
create index if not exists business_sales_created_idx on public.business_sales(created_at desc);
create index if not exists business_sale_items_sale_idx on public.business_sale_items(sale_id);

create or replace function public.has_business_role(roles text[])
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select exists (select 1 from public.business_staff s where s.user_id = auth.uid() and s.role = any(roles));
$$;
revoke all on function public.has_business_role(text[]) from public;
grant execute on function public.has_business_role(text[]) to authenticated;

alter table public.business_staff enable row level security;
alter table public.business_sales enable row level security;
alter table public.business_sale_items enable row level security;
alter table public.business_models enable row level security;
grant select on public.business_staff, public.business_sales, public.business_sale_items, public.business_models to authenticated;
grant insert on public.business_models to authenticated;
grant usage, select on sequence public.business_models_id_seq to authenticated;
grant insert on public.products to authenticated;

drop policy if exists "Staff can view own staff role" on public.business_staff;
create policy "Staff can view own staff role" on public.business_staff for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins can view staff roles" on public.business_staff;
create policy "Admins can view staff roles" on public.business_staff for select to authenticated using (public.has_business_role(array['admin']));
-- Roles are only changed through the SECURITY DEFINER admin RPC below; no client write policy is granted.

drop policy if exists "Authorized staff can view business sales" on public.business_sales;
create policy "Authorized staff can view business sales" on public.business_sales for select to authenticated using (public.has_business_role(array['sales_personnel','admin','instructor']));
drop policy if exists "Authorized staff can view sale items" on public.business_sale_items;
create policy "Authorized staff can view sale items" on public.business_sale_items for select to authenticated using (public.has_business_role(array['sales_personnel','admin','instructor']));

drop policy if exists "Instructors can read trained models and metrics" on public.business_models;
create policy "Instructors can read trained models and metrics" on public.business_models for select to authenticated using (public.has_business_role(array['instructor']));
drop policy if exists "Instructors can save trained models" on public.business_models;
create policy "Instructors can save trained models" on public.business_models for insert to authenticated with check (public.has_business_role(array['instructor']));

drop policy if exists "Staff can view active catalog products" on public.products;
create policy "Staff can view active catalog products" on public.products for select to authenticated using (
  is_active = true or public.has_business_role(array['inventory_clerk','admin'])
);
drop policy if exists "Inventory staff can add products" on public.products;
create policy "Inventory staff can add products" on public.products for insert to authenticated with check (public.has_business_role(array['inventory_clerk','admin']));
drop policy if exists "Inventory staff can update products" on public.products;
create policy "Inventory staff can update products" on public.products for update to authenticated using (public.has_business_role(array['inventory_clerk','admin'])) with check (public.has_business_role(array['inventory_clerk','admin']));
revoke update on public.products from authenticated;
grant update (inventory, reorder_level, updated_at) on public.products to authenticated;

create or replace function public.set_business_product_active(p_product_id uuid, p_is_active boolean)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.has_business_role(array['admin']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_product_id is null or p_is_active is null then raise exception 'Product and active state are required' using errcode = '22023'; end if;
  update public.products set is_active = p_is_active, updated_at = now() where id = p_product_id;
  if not found then return false; end if;
  return true;
end;
$$;
revoke all on function public.set_business_product_active(uuid,boolean) from public, anon;
grant execute on function public.set_business_product_active(uuid,boolean) to authenticated;

create or replace function public.create_business_sale(items jsonb)
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare
  v_sale_id uuid := gen_random_uuid();
  v_receipt text := 'GS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_total numeric(12,2) := 0;
  v_currency text;
begin
  if not public.has_business_role(array['sales_personnel','admin']) then
    raise exception 'Not authorized to create sales' using errcode = '42501';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) < 1 or jsonb_array_length(items) > 100 then
    raise exception 'Sale must contain between 1 and 100 item lines' using errcode = '22023';
  end if;
  -- Lock each referenced inventory row before checking or changing stock.
  for v_item in
    select jsonb_build_object('product_id', e.value->>'product_id', 'quantity', sum((e.value->>'quantity')::integer))
    from jsonb_array_elements(items) e(value)
    group by e.value->>'product_id'
    order by (e.value->>'product_id')::uuid
  loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 10000 then raise exception 'Invalid quantity' using errcode = '22023'; end if;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and is_active = true for update;
    if not found then raise exception 'Product is not available' using errcode = 'P0002'; end if;
    if v_product.inventory < v_qty then raise exception 'Insufficient stock for %', v_product.title using errcode = '23514'; end if;
    if v_currency is null then v_currency := v_product.currency_code;
    elsif v_currency <> v_product.currency_code then raise exception 'A sale cannot mix currencies' using errcode = '22023'; end if;
    v_total := v_total + round(v_product.price * v_qty, 2);
  end loop;
  insert into public.business_sales(id, receipt_number, employee_user_id, total, currency_code)
    values(v_sale_id, v_receipt, auth.uid(), v_total, coalesce(v_currency,'PHP'));
  for v_item in select value from jsonb_array_elements(items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid for update;
    update public.products set inventory = inventory - v_qty, updated_at = now() where id = v_product.id;
    insert into public.business_sale_items(sale_id, product_id, product_title, quantity, unit_price, line_total)
      values(v_sale_id, v_product.id, v_product.title, v_qty, v_product.price, round(v_product.price*v_qty,2));
  end loop;
  return jsonb_build_object('sale_id',v_sale_id,'receipt_number',v_receipt,'total',v_total,'currency_code',coalesce(v_currency,'PHP'));
end;
$$;
revoke all on function public.create_business_sale(jsonb) from public;
grant execute on function public.create_business_sale(jsonb) to authenticated;

-- Storefront demo checkout and unified staff/storefront reporting.
-- These definitions are also provided as supabase/storefront_demo_sales.sql for existing projects.
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

create or replace function public.get_business_model_artifacts()
returns table(model_type text, version integer, artifact jsonb, trained_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.has_business_role(array['instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query select m.model_type,m.version,m.artifact,m.trained_at from public.business_models m
    where m.version=(select max(m2.version) from public.business_models m2 where m2.model_type=m.model_type);
end;
$$;
revoke all on function public.get_business_model_artifacts() from public;
grant execute on function public.get_business_model_artifacts() to authenticated;

create or replace function public._predict_business_tree(node jsonb, features numeric[])
returns numeric language plpgsql immutable set search_path = public
as $$
declare
  feature_index integer;
  threshold_value numeric;
begin
  if not (node ? 'feature') or node->'left' is null or node->'right' is null then
    return (node->>'value')::numeric;
  end if;
  feature_index := (node->>'feature')::integer + 1;
  threshold_value := (node->>'threshold')::numeric;
  if features[feature_index] <= threshold_value then
    return public._predict_business_tree(node->'left', features);
  end if;
  return public._predict_business_tree(node->'right', features);
end;
$$;
revoke all on function public._predict_business_tree(jsonb,numeric[]) from public;

create or replace function public.predict_business_demand(p_unit_price numeric,p_promotion boolean,p_seasonality numeric,p_previous_month_demand numeric)
returns table(model_type text,predicted_units integer)
language plpgsql security definer set search_path = public, auth
as $$
declare
  model_row record;
  feature_values numeric[] := array[p_unit_price,case when p_promotion then 1 else 0 end,p_seasonality,p_previous_month_demand];
  prediction_value numeric;
begin
  if not public.has_business_role(array['admin','instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_unit_price is null or p_unit_price < 0 or p_seasonality is null or p_seasonality < 0 or p_seasonality > 3 or p_previous_month_demand is null or p_previous_month_demand < 0 then
    raise exception 'Invalid prediction inputs' using errcode = '22023';
  end if;
  for model_row in
    select distinct on (m.model_type) m.model_type,m.version,m.artifact
    from public.business_models m order by m.model_type,m.version desc
  loop
    if model_row.model_type='linear_regression' then
      prediction_value := (model_row.artifact->>'intercept')::numeric +
        (model_row.artifact->>'slope')::numeric * feature_values[(model_row.artifact->>'feature')::integer+1];
    else
      select avg(public._predict_business_tree(tree.value,feature_values)) into prediction_value
      from jsonb_array_elements(model_row.artifact->'trees') as tree(value);
    end if;
    model_type := model_row.model_type;
    predicted_units := greatest(0,round(coalesce(prediction_value,0)))::integer;
    return next;
  end loop;
end;
$$;
revoke all on function public.predict_business_demand(numeric,boolean,numeric,numeric) from public;
grant execute on function public.predict_business_demand(numeric,boolean,numeric,numeric) to authenticated;

create or replace function public.list_business_users()
returns table(user_id uuid, email text, display_name text, role text)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.has_business_role(array['admin']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query select u.id::uuid,u.email::text,coalesce(p.display_name,''),s.role
  from auth.users u join public.business_staff s on s.user_id=u.id
  left join public.profiles p on p.id=u.id order by u.email;
end;
$$;
revoke all on function public.list_business_users() from public;
grant execute on function public.list_business_users() to authenticated;

create or replace function public.assign_business_role(p_email text,p_role text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare target_id uuid;
begin
  if not public.has_business_role(array['admin']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_role not in ('inventory_clerk','sales_personnel','admin','instructor') then raise exception 'Invalid staff role' using errcode = '22023'; end if;
  select id into target_id from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if target_id is null then raise exception 'No registered account was found with that email' using errcode = 'P0002'; end if;
  if target_id=auth.uid() and p_role<>'admin' then raise exception 'You cannot remove your own administrator access' using errcode = '42501'; end if;
  insert into public.business_staff(user_id,role) values(target_id,p_role)
  on conflict(user_id) do update set role=excluded.role,updated_at=now();
  return true;
end;
$$;
revoke all on function public.assign_business_role(text,text) from public;
grant execute on function public.assign_business_role(text,text) to authenticated;

create or replace function public.revoke_business_access(p_email text)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare target_id uuid;
begin
  if not public.has_business_role(array['admin']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  select id into target_id from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if target_id=auth.uid() then raise exception 'You cannot revoke your own staff access' using errcode = '42501'; end if;
  delete from public.business_staff where user_id=target_id;
  return found;
end;
$$;
revoke all on function public.revoke_business_access(text) from public;
grant execute on function public.revoke_business_access(text) to authenticated;
