-- Reversible product archive/restore for existing Goodstock Supabase projects.
-- Safe to rerun; does not delete products or alter historical order references.
create or replace function public.set_business_product_active(p_product_id uuid, p_is_active boolean)
returns boolean language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.has_business_role(array['admin']) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_product_id is null or p_is_active is null then
    raise exception 'Product and active state are required' using errcode = '22023';
  end if;

  update public.products
  set is_active = p_is_active, updated_at = now()
  where id = p_product_id;
  if not found then return false; end if;
  return true;
end;
$$;

revoke all on function public.set_business_product_active(uuid,boolean) from public, anon;
grant execute on function public.set_business_product_active(uuid,boolean) to authenticated;
