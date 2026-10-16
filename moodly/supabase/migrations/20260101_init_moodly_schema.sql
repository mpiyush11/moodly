-- Moodly: integer INR amounts, shared blank inventory, least-privilege RLS.
begin;
create extension if not exists pgcrypto;

create table public.moodly_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.moodly_admins enable row level security;
create or replace function public.is_moodly_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.moodly_admins where user_id = auth.uid());
$$;
revoke all on function public.is_moodly_admin() from public;
grant execute on function public.is_moodly_admin() to anon, authenticated, service_role;
create policy "Admins can see their own membership" on public.moodly_admins for select to authenticated using (user_id = auth.uid());
grant select on public.moodly_admins to authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('down-shoulder','everyday','classic','polo')),
  base_price integer not null check (base_price between 1 and 100000),
  mrp integer not null check (mrp >= base_price and mrp <= 200000),
  description text,
  fabric_details text not null default '240-280 GSM 100% Combed Cotton',
  images text[] not null check (cardinality(images) between 1 and 8),
  colors text[] not null check (cardinality(colors) between 1 and 3 and colors <@ array['#111111','#FFFFFF','#D2B48C']::text[]),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_active_category_idx on public.products(category, created_at) where is_active;
create table public.inventory_blanks (
  id uuid primary key default gen_random_uuid(),
  color_name text not null check (color_name in ('Black','White','Beige')),
  size text not null check (size in ('S','M','L','XL','XXL')),
  is_in_stock boolean not null default true,
  stock_count integer not null default 50 check (stock_count >= 0),
  unique (color_name, size)
);
create table public.store_settings (
  key text primary key check (key in ('whatsapp_number','banner_images','pickup_discount')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  check (
    (key = 'whatsapp_number' and jsonb_typeof(value) = 'string') or
    (key = 'banner_images' and jsonb_typeof(value) = 'array' and jsonb_array_length(value) = 3) or
    (key = 'pickup_discount' and jsonb_typeof(value) = 'number' and (value::text)::integer between 0 and 1000)
  )
);
-- Intentionally blank until the owner sets a verified business number in Studio.
insert into public.store_settings(key,value) values
 ('whatsapp_number','""'),
 ('banner_images','["/images/hero-editorial.jpg","/images/tee-bone.jpg","/images/tee-sand.jpg"]'),
 ('pickup_discount','60');
insert into public.inventory_blanks(color_name,size)
select color_name, size from unnest(array['Black','White','Beige']) color_name cross join unnest(array['S','M','L','XL','XXL']) size;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_name text not null check (length(customer_name) between 2 and 100),
  whatsapp_number text not null check (whatsapp_number ~ '^[6-9][0-9]{9}$'),
  city text not null check (length(city) between 2 and 80),
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  delivery_mode text not null check (delivery_mode in ('PAN_INDIA','JAIPUR_PICKUP')),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  total_amount integer not null check (total_amount >= 0),
  status text not null default 'PENDING_PAYMENT' check (status in ('PENDING_PAYMENT','PAID','PRINTING','SHIPPED','DELIVERED','CANCELLED')),
  created_at timestamptz not null default now(),
  reservation_expires_at timestamptz not null default (now() + interval '30 minutes'),
  inventory_reserved boolean not null default true,
  idempotency_key uuid not null unique,
  checkout_hash text not null,
  updated_at timestamptz not null default now()
);
create index orders_status_created_idx on public.orders(status,created_at desc);
create index orders_expiry_idx on public.orders(reservation_expires_at) where status = 'PENDING_PAYMENT';
create index orders_phone_created_idx on public.orders(whatsapp_number,created_at desc);

alter table public.products enable row level security;
alter table public.inventory_blanks enable row level security;
alter table public.orders enable row level security;
alter table public.store_settings enable row level security;
create policy "Active catalog is public" on public.products for select to anon, authenticated using (is_active or public.is_moodly_admin());
create policy "Admins manage catalog" on public.products for all to authenticated using (public.is_moodly_admin()) with check (public.is_moodly_admin());
create policy "Public reads blank availability" on public.inventory_blanks for select to anon, authenticated using (true);
create policy "Admins manage blanks" on public.inventory_blanks for all to authenticated using (public.is_moodly_admin()) with check (public.is_moodly_admin());
create policy "Public reads store settings" on public.store_settings for select to anon, authenticated using (true);
create policy "Admins manage store settings" on public.store_settings for all to authenticated using (public.is_moodly_admin()) with check (public.is_moodly_admin());
create policy "Admins read orders" on public.orders for select to authenticated using (public.is_moodly_admin());
-- No anon/authenticated order INSERT or UPDATE policy. Only the server RPC can write.
grant select on public.products, public.inventory_blanks, public.store_settings to anon;
grant select,insert,update,delete on public.products, public.inventory_blanks, public.store_settings to authenticated;
grant select on public.orders to authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
grant all on public.products, public.inventory_blanks, public.store_settings, public.orders, public.moodly_admins to service_role;

-- Deadlock-safe stock return, executed only by server-verified transactions.
create or replace function public.release_moodly_stock(p_items jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record;
begin
  for r in select x->>'color' color_name, x->>'size' size, sum((x->>'qty')::integer)::integer qty
    from jsonb_array_elements(p_items) x group by 1,2 order by 1,2 loop
    update public.inventory_blanks set stock_count = stock_count + r.qty where color_name=r.color_name and size=r.size;
  end loop;
end;
$$;
create or replace function public.expire_moodly_reservations() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.orders; affected integer := 0;
begin
  for r in select * from public.orders where status='PENDING_PAYMENT' and reservation_expires_at < now() order by id for update skip locked loop
    if r.inventory_reserved then perform public.release_moodly_stock(r.items); end if;
    update public.orders set status='CANCELLED', inventory_reserved=false, updated_at=now() where id=r.id;
    affected := affected+1;
  end loop;
  return affected;
end;
$$;

create or replace function public.create_moodly_order(
  p_items jsonb, p_customer jsonb, p_delivery_mode text, p_idempotency_key uuid, p_checkout_hash text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  existing public.orders; saved public.orders; product public.products; blank public.inventory_blanks;
  item jsonb; verified_items jsonb := '[]'; demand record; color_name text; hex text; item_size text;
  quantity integer; total_qty integer := 0; subtotal integer := 0; discount integer := 0;
  phone text; code text; alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; attempts integer := 0;
begin
  if p_idempotency_key is null or p_checkout_hash is null or length(p_checkout_hash) <> 64 then raise exception 'Invalid checkout identity' using errcode='22023'; end if;
  -- Serialise retries for the same idempotency key before inspecting existing orders.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text,0));
  select * into existing from public.orders where idempotency_key=p_idempotency_key;
  select value #>> '{}' into phone from public.store_settings where key='whatsapp_number';
  if phone is null or phone !~ '^[1-9][0-9]{9,14}$' then raise exception 'Store WhatsApp number is not configured' using errcode='22023'; end if;
  if existing.id is not null then
    if existing.checkout_hash <> p_checkout_hash then raise exception 'Idempotency key was already used for a different checkout' using errcode='22023'; end if;
    if existing.status='CANCELLED' or (existing.status='PENDING_PAYMENT' and existing.reservation_expires_at < now()) then raise exception 'This reservation expired; start a new checkout' using errcode='22023'; end if;
    return jsonb_build_object('order',to_jsonb(existing),'business_phone',phone);
  end if;
  if p_delivery_mode not in ('PAN_INDIA','JAIPUR_PICKUP') or p_delivery_mode is null then raise exception 'Invalid delivery mode' using errcode='22023'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Invalid bag' using errcode='22023'; end if;
  if p_customer is null or jsonb_typeof(p_customer) <> 'object' or length(coalesce(p_customer->>'name','')) not between 2 and 100 or coalesce(p_customer->>'phone','') !~ '^[6-9][0-9]{9}$' or length(coalesce(p_customer->>'city','')) not between 2 and 80 or coalesce(p_customer->>'pincode','') !~ '^[1-9][0-9]{5}$' then raise exception 'Invalid customer details' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_customer->>'phone',1));
  if (select count(*) from public.orders where whatsapp_number=p_customer->>'phone' and created_at > now()-interval '15 minutes') >= 5 then raise exception 'Too many orders. Please try again in 15 minutes' using errcode='P0001'; end if;
  perform public.expire_moodly_reservations();
  -- Product locks are sorted to avoid deadlocks with concurrent catalog edits.
  perform id from public.products where id in (select (x->>'productId')::uuid from jsonb_array_elements(p_items) x) order by id for share;
  for item in select * from jsonb_array_elements(p_items) loop
    if coalesce(item->>'qty','') !~ '^[0-9]+$' then raise exception 'Invalid quantity' using errcode='22023'; end if;
    quantity := (item->>'qty')::integer; hex := item->>'color'; item_size := item->>'size';
    if quantity not between 1 and 10 or item_size not in ('S','M','L','XL','XXL') or item_size is null then raise exception 'Invalid size or quantity' using errcode='22023'; end if;
    total_qty := total_qty+quantity;
    select * into product from public.products where id=(item->>'productId')::uuid and is_active;
    if product.id is null then raise exception 'Product is no longer available' using errcode='P0001'; end if;
    if hex is null or not (hex=any(product.colors)) then raise exception 'Colour is not available for this product' using errcode='P0001'; end if;
    color_name := case hex when '#111111' then 'Black' when '#FFFFFF' then 'White' when '#D2B48C' then 'Beige' end;
    if color_name is null then raise exception 'Invalid colour' using errcode='22023'; end if;
    subtotal := subtotal + product.base_price*quantity;
    verified_items := verified_items || jsonb_build_array(jsonb_build_object('product_id',product.id,'title',product.title,'size',item_size,'color',color_name,'color_hex',hex,'qty',quantity,'unit_price',product.base_price,'image',product.images[1]));
  end loop;
  if total_qty > 50 then raise exception 'Maximum 50 pieces per order' using errcode='22023'; end if;
  for demand in select x->>'color' color_name, x->>'size' size, sum((x->>'qty')::integer)::integer qty from jsonb_array_elements(verified_items) x group by 1,2 order by 1,2 loop
    select * into blank from public.inventory_blanks b where b.color_name=demand.color_name and b.size=demand.size for update;
    if blank.id is null or not blank.is_in_stock or blank.stock_count < demand.qty then raise exception 'Requested blank colour / size is out of stock' using errcode='P0001'; end if;
    update public.inventory_blanks set stock_count=stock_count-demand.qty where id=blank.id;
  end loop;
  if p_delivery_mode='JAIPUR_PICKUP' then
    select least(subtotal,(value::text)::integer) into discount from public.store_settings where key='pickup_discount';
    discount := coalesce(discount,60);
  end if;
  loop
    attempts := attempts+1; code := '#MDLY-';
    for i in 1..4 loop code := code || substr(alphabet,1+(get_byte(decode(replace(gen_random_uuid()::text,'-',''),'hex'),0) % length(alphabet)),1); end loop;
    begin
      insert into public.orders(order_code,customer_name,whatsapp_number,city,pincode,delivery_mode,items,discount_amount,total_amount,idempotency_key,checkout_hash)
      values(code,p_customer->>'name',p_customer->>'phone',p_customer->>'city',p_customer->>'pincode',p_delivery_mode,verified_items,discount,greatest(0,subtotal-discount),p_idempotency_key,p_checkout_hash)
      returning * into saved;
      exit;
    exception when unique_violation then
      if attempts >= 10 then raise exception 'Unable to allocate order code'; end if;
    end;
  end loop;
  return jsonb_build_object('order',to_jsonb(saved),'business_phone',phone);
end;
$$;

create or replace function public.set_moodly_order_status(p_order_id uuid,p_status text) returns public.orders
language plpgsql security definer set search_path = public, pg_temp as $$
declare saved public.orders; allowed text[];
begin
  select * into saved from public.orders where id=p_order_id for update;
  if saved.id is null then raise exception 'Order not found' using errcode='P0001'; end if;
  if saved.status=p_status then return saved; end if;
  allowed := case saved.status when 'PENDING_PAYMENT' then array['PAID','CANCELLED'] when 'PAID' then array['PRINTING','CANCELLED'] when 'PRINTING' then array['SHIPPED','CANCELLED'] when 'SHIPPED' then array['DELIVERED'] else array[]::text[] end;
  if p_status is null or not (p_status=any(allowed)) then raise exception 'Invalid order status transition' using errcode='22023'; end if;
  if p_status='PAID' and saved.reservation_expires_at < now() then raise exception 'Order reservation expired; create a new order' using errcode='P0001'; end if;
  if p_status='CANCELLED' and saved.inventory_reserved then perform public.release_moodly_stock(saved.items); end if;
  update public.orders set status=p_status,inventory_reserved=case when p_status in ('PRINTING','CANCELLED') then false else inventory_reserved end,updated_at=now() where id=p_order_id returning * into saved;
  return saved;
end;
$$;
revoke all on function public.release_moodly_stock(jsonb) from public, anon, authenticated;
revoke all on function public.expire_moodly_reservations() from public, anon, authenticated;
revoke all on function public.create_moodly_order(jsonb,jsonb,text,uuid,text) from public, anon, authenticated;
revoke all on function public.set_moodly_order_status(uuid,text) from public, anon, authenticated;
grant execute on function public.expire_moodly_reservations(), public.create_moodly_order(jsonb,jsonb,text,uuid,text), public.set_moodly_order_status(uuid,text) to service_role;

-- Public product images; only Studio admins can modify objects.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "Public product image read" on storage.objects for select to anon,authenticated using (bucket_id='product-images');
create policy "Admin product image write" on storage.objects for insert to authenticated with check (bucket_id='product-images' and public.is_moodly_admin());
create policy "Admin product image update" on storage.objects for update to authenticated using (bucket_id='product-images' and public.is_moodly_admin()) with check (bucket_id='product-images' and public.is_moodly_admin());
create policy "Admin product image delete" on storage.objects for delete to authenticated using (bucket_id='product-images' and public.is_moodly_admin());
-- Enable authenticated Realtime updates; order visibility is still governed by RLS.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.orders, public.inventory_blanks, public.products, public.store_settings;
  end if;
end $$;
commit;
