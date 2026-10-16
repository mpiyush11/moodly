-- Add owner-managed social/reply information. Retain catalogue, stock and historic orders.
begin;
do $$ declare entry record; begin
  for entry in select conname from pg_constraint where conrelid='public.store_settings'::regclass and contype='c' loop
    execute format('alter table public.store_settings drop constraint %I',entry.conname);
  end loop;
end $$;
alter table public.store_settings add constraint moodly_settings_keys check(key in ('whatsapp_number','banner_images','pickup_discount','instagram_url','whatsapp_catalog_url','reply_hours','dispatch_note'));
alter table public.store_settings add constraint moodly_settings_values check(
  (key in ('whatsapp_number','instagram_url','whatsapp_catalog_url','reply_hours','dispatch_note') and jsonb_typeof(value)='string') or
  (key='banner_images' and jsonb_typeof(value)='array' and jsonb_array_length(value)=3) or
  (key='pickup_discount' and jsonb_typeof(value)='number' and (value::text)::integer between 0 and 1000)
);
insert into public.store_settings(key,value) values
 ('instagram_url','""'),('whatsapp_catalog_url','""'),
 ('reply_hours','"We reply during available hours. Your request is not an instant order confirmation."'),
 ('dispatch_note','"Printing feasibility and dispatch timing are confirmed on WhatsApp before payment."')
 on conflict(key) do nothing;
-- Correct only agent-provided template fabric claims, never owner-edited specifications.
update public.products set fabric_details='240 GSM cotton tee blank'
where (id::text like '00000000-0000-4000-8000-%' or fabric_details='280 GSM 100% Combed Cotton')
 and fabric_details in ('280 GSM 100% Combed Cotton','260 GSM 100% Combed Cotton Piqué');
notify pgrst,'reload schema';
commit;
