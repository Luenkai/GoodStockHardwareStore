-- Business application extension for the existing Supabase project.
-- Apply after supabase/schema.sql. All privileged writes validate staff roles in PostgreSQL.

alter table public.products add column if not exists sku text;
alter table public.products add column if not exists reorder_level integer not null default 5 check (reorder_level >= 0);
alter table public.products add column if not exists min_stock integer;
alter table public.products add column if not exists max_stock integer;
update public.products
set min_stock = coalesce(min_stock, reorder_level, 5),
    max_stock = coalesce(max_stock, greatest(inventory, coalesce(min_stock, reorder_level, 5), 50));
alter table public.products alter column min_stock set default 5;
alter table public.products alter column min_stock set not null;
alter table public.products alter column max_stock set default 50;
alter table public.products alter column max_stock set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_min_stock_nonnegative') then
    alter table public.products add constraint products_min_stock_nonnegative check (min_stock >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_max_stock_nonnegative') then
    alter table public.products add constraint products_max_stock_nonnegative check (max_stock >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_stock_range_ordered') then
    alter table public.products add constraint products_stock_range_ordered check (max_stock >= min_stock);
  end if;
end;
$$;
create or replace function public.sync_business_stock_thresholds()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.min_stock is null or (new.min_stock = 5 and new.reorder_level is distinct from 5) then
      new.min_stock := coalesce(new.reorder_level, 5);
    end if;
    new.reorder_level := new.min_stock;
    if new.max_stock is null then new.max_stock := greatest(new.min_stock, new.inventory, 50); end if;
  elsif new.min_stock is distinct from old.min_stock then
    new.reorder_level := new.min_stock;
  elsif new.reorder_level is distinct from old.reorder_level then
    new.min_stock := new.reorder_level;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_business_stock_thresholds() from public, anon, authenticated;
drop trigger if exists sync_business_stock_thresholds on public.products;
create trigger sync_business_stock_thresholds before insert or update of min_stock, reorder_level on public.products
for each row execute function public.sync_business_stock_thresholds();
update public.products set sku = 'GS-' || upper(substr(replace(id::text, '-', ''), 1, 10)) where sku is null;
alter table public.products alter column sku set not null;
create unique index if not exists products_sku_unique_idx on public.products(sku);

create table if not exists public.business_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('inventory_clerk','sales_personnel','admin','instructor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.business_access_requests (
  request_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create index if not exists business_access_requests_status_idx on public.business_access_requests(status, requested_at desc);
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
create table if not exists public.business_product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  supplier_name text not null default '' check (char_length(supplier_name) <= 200),
  supplier_price numeric(12,2) not null check (supplier_price >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
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
alter table public.business_access_requests enable row level security;
alter table public.business_product_costs enable row level security;
grant select on public.business_staff, public.business_sales, public.business_sale_items, public.business_models to authenticated;
grant select on public.business_access_requests to authenticated;
grant insert on public.business_models to authenticated;
grant usage, select on sequence public.business_models_id_seq to authenticated;
grant insert on public.products to authenticated;

drop policy if exists "Staff can view own staff role" on public.business_staff;
create policy "Staff can view own staff role" on public.business_staff for select to authenticated using (user_id = auth.uid());
drop policy if exists "Admins can view staff roles" on public.business_staff;
drop policy if exists "Admins and instructors can view staff roles" on public.business_staff;
create policy "Admins and instructors can view staff roles" on public.business_staff for select to authenticated using (public.has_business_role(array['admin','instructor']));
drop policy if exists "Users can view own business access request" on public.business_access_requests;
create policy "Users can view own business access request" on public.business_access_requests for select to authenticated using (user_id=auth.uid());
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
  is_active = true or public.has_business_role(array['inventory_clerk','admin','instructor'])
);
drop policy if exists "Inventory staff can add products" on public.products;
create policy "Inventory staff can add products" on public.products for insert to authenticated with check (public.has_business_role(array['inventory_clerk','admin','instructor']));
drop policy if exists "Inventory staff can update products" on public.products;
create policy "Inventory staff can update products" on public.products for update to authenticated using (public.has_business_role(array['inventory_clerk','admin','instructor'])) with check (public.has_business_role(array['inventory_clerk','admin','instructor']));
revoke update on public.products from authenticated;
grant update (inventory, reorder_level, min_stock, max_stock, updated_at) on public.products to authenticated;

create or replace function public.set_business_product_active(p_product_id uuid, p_is_active boolean)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.has_business_role(array['admin','instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
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
  if not public.has_business_role(array['sales_personnel','admin','instructor']) then
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
  return jsonb_build_object(
    'sale_id',v_sale_id,
    'receipt_number',v_receipt,
    'total',v_total,
    'currency_code',coalesce(v_currency,'PHP'),
    'created_at',now(),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('product_title',i.product_title,'quantity',i.quantity,'unit_price',i.unit_price,'line_total',i.line_total) order by i.id), '[]'::jsonb) from public.business_sale_items i where i.sale_id=v_sale_id)
  );
end;
$$;
revoke all on function public.create_business_sale(jsonb) from public;
grant execute on function public.create_business_sale(jsonb) to authenticated;

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
    'low_stock_count',(select count(*) from public.products where is_active and inventory <= min_stock),
    'stock_units',(select coalesce(sum(inventory),0) from public.products where is_active),
    'sales_count',case when can_view_sales then (select count(*) from public.business_sales where status='completed') else 0 end,
    'revenue',case when can_view_sales then (select coalesce(sum(total),0) from public.business_sales where status='completed') else 0 end,
    'low_stock',(select coalesce(jsonb_agg(x), '[]'::jsonb) from (select id,title,handle,inventory,min_stock,max_stock,greatest(max_stock-inventory,0) as suggested_replenishment,sku from public.products where is_active and inventory <= min_stock order by inventory asc limit 6) x),
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
  if not public.has_business_role(array['admin','instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
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
  if not public.has_business_role(array['admin','instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
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
  if not public.has_business_role(array['admin','instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  select id into target_id from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if target_id=auth.uid() then raise exception 'You cannot revoke your own staff access' using errcode = '42501'; end if;
  delete from public.business_staff where user_id=target_id;
  return found;
end;
$$;
revoke all on function public.revoke_business_access(text) from public;
grant execute on function public.revoke_business_access(text) to authenticated;


-- Browser users can read only their own access-request status; all writes go through RPCs.
revoke all on table public.business_access_requests from public, anon, authenticated;
grant select on table public.business_access_requests to authenticated;
revoke all on table public.business_product_costs from public, anon, authenticated;

create or replace function public.request_business_access(p_message text default '')
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare
  request_row public.business_access_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in before requesting business access' using errcode = '42501'; end if;
  if public.has_business_role(array['inventory_clerk','sales_personnel','admin','instructor']) then
    raise exception 'Your business access is already assigned' using errcode = '23505';
  end if;
  if char_length(coalesce(p_message,'')) > 500 then raise exception 'Request message must be 500 characters or fewer' using errcode = '22023'; end if;
  insert into public.business_access_requests(user_id,message,status,requested_at,reviewed_at,reviewed_by)
    values(auth.uid(),coalesce(trim(p_message),''),'pending',now(),null,null)
  on conflict(user_id) do update set message=excluded.message,status='pending',requested_at=now(),reviewed_at=null,reviewed_by=null
  returning * into request_row;
  return jsonb_build_object('request_id',request_row.request_id,'status',request_row.status,'requested_at',request_row.requested_at);
end;
$$;
revoke all on function public.request_business_access(text) from public, anon;
grant execute on function public.request_business_access(text) to authenticated;

create or replace function public.list_business_access_requests()
returns table(request_id uuid,user_id uuid,email text,display_name text,message text,status text,requested_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.has_business_role(array['admin','instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select r.request_id,r.user_id,u.email::text,coalesce(p.display_name,''),r.message,r.status,r.requested_at
    from public.business_access_requests r
    join auth.users u on u.id=r.user_id
    left join public.profiles p on p.id=r.user_id
    where r.status='pending'
    order by r.requested_at asc;
end;
$$;
revoke all on function public.list_business_access_requests() from public, anon;
grant execute on function public.list_business_access_requests() to authenticated;

create or replace function public.review_business_access_request(p_request_id uuid,p_decision text,p_role text default null)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
declare
  request_row public.business_access_requests%rowtype;
begin
  if not public.has_business_role(array['admin','instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_decision is null or p_decision not in ('approve','reject') then raise exception 'Decision must be approve or reject' using errcode = '22023'; end if;
  if p_decision='approve' and p_role not in ('inventory_clerk','sales_personnel','admin','instructor') then
    raise exception 'Choose a valid staff role before approving' using errcode = '22023';
  end if;
  select * into request_row from public.business_access_requests where request_id=p_request_id and status='pending' for update;
  if not found then raise exception 'Pending access request not found' using errcode = 'P0002'; end if;
  if request_row.user_id=auth.uid() then raise exception 'You cannot approve your own access request' using errcode = '42501'; end if;
  if p_decision='approve' then
    insert into public.business_staff(user_id,role) values(request_row.user_id,p_role)
    on conflict(user_id) do update set role=excluded.role,updated_at=now();
    update public.business_access_requests set status='approved',reviewed_at=now(),reviewed_by=auth.uid() where request_id=p_request_id;
  else
    update public.business_access_requests set status='rejected',reviewed_at=now(),reviewed_by=auth.uid() where request_id=p_request_id;
  end if;
  return true;
end;
$$;
revoke all on function public.review_business_access_request(uuid,text,text) from public, anon;
grant execute on function public.review_business_access_request(uuid,text,text) to authenticated;

create or replace function public.get_business_product_costs()
returns table(product_id uuid,supplier_name text,supplier_price numeric,currency_code text,updated_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.has_business_role(array['admin','instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select p.id,c.supplier_name,c.supplier_price,p.currency_code,c.updated_at
    from public.business_product_costs c join public.products p on p.id=c.product_id
    order by p.title;
end;
$$;
revoke all on function public.get_business_product_costs() from public, anon;
grant execute on function public.get_business_product_costs() to authenticated;

create or replace function public.upsert_business_product_cost(p_product_id uuid,p_supplier_name text,p_supplier_price numeric)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.has_business_role(array['admin','instructor']) then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_product_id is null or p_supplier_price is null or p_supplier_price < 0 then raise exception 'Product and nonnegative supplier price are required' using errcode = '22023'; end if;
  if char_length(coalesce(p_supplier_name,'')) > 200 then raise exception 'Supplier name must be 200 characters or fewer' using errcode = '22023'; end if;
  if not exists (select 1 from public.products where id=p_product_id) then raise exception 'Product not found' using errcode = 'P0002'; end if;
  insert into public.business_product_costs(product_id,supplier_name,supplier_price,updated_at,updated_by)
    values(p_product_id,trim(coalesce(p_supplier_name,'')),p_supplier_price,now(),auth.uid())
  on conflict(product_id) do update set supplier_name=excluded.supplier_name,supplier_price=excluded.supplier_price,updated_at=now(),updated_by=auth.uid();
  return true;
end;
$$;
revoke all on function public.upsert_business_product_cost(uuid,text,numeric) from public, anon;
grant execute on function public.upsert_business_product_cost(uuid,text,numeric) to authenticated;
