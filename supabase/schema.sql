-- Goodstock Hardware demo store schema for Supabase.
-- Run this entire file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  handle text not null unique,
  description text not null default '',
  product_type text not null default 'Hardware',
  vendor text not null default 'Goodstock Hardware',
  price numeric(12, 2) not null default 0 check (price >= 0),
  currency_code text not null default 'PHP',
  inventory integer not null default 0 check (inventory >= 0),
  image_url text,
  image_alt text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Default',
  recipient_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  postal_code text not null,
  country text not null default 'PH',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled')),
  customer_email text,
  total numeric(12, 2) not null default 0 check (total >= 0),
  currency_code text not null default 'PHP',
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  image_url text
);

create index if not exists addresses_user_id_idx on public.addresses(user_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists products_active_idx on public.products(is_active, created_at desc);

alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products for select using (is_active = true);

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

 drop policy if exists "Users can manage own addresses" on public.addresses;
create policy "Users can manage own addresses" on public.addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders" on public.orders for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view own order items" on public.order_items;
create policy "Users can view own order items" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
drop policy if exists "Users can create own order items" on public.order_items;
create policy "Users can create own order items" on public.order_items for insert with check (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.products (title, handle, description, product_type, vendor, price, currency_code, inventory, image_url, image_alt)
values
  ('No. 10 × 7/8 in. Phillips Pan-Head Sheet-Metal Screws', 'sheet-metal-screws', 'Steel sheet-metal screws with a zinc-plated finish, pan head, Phillips drive, and sharp self-tapping point.', 'Fasteners', 'HILLMAN GROUP RSC', 149.00, 'PHP', 40, '/images/hillman-screws.jpg', 'Zinc-plated Phillips pan-head sheet-metal screw'),
  ('3-Piece LM317 Adjustable Voltage Regulator Module', 'lm317-voltage-regulator', 'Three LM317 adjustable voltage regulator modules for electronics projects and bench prototyping.', 'Power & Electrical', 'Electronic Pro', 299.00, 'PHP', 18, '/images/lm317-module.jpg', 'LM317 adjustable voltage regulator circuit board module')
on conflict (handle) do update set
  title = excluded.title,
  description = excluded.description,
  product_type = excluded.product_type,
  vendor = excluded.vendor,
  price = excluded.price,
  currency_code = excluded.currency_code,
  inventory = excluded.inventory,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  is_active = true,
  updated_at = now();
