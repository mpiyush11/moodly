import { readFile } from 'node:fs/promises';
import { fileURLToPath,pathToFileURL } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
import postgres from 'postgres';
import { databaseOptions,isSharedTestDatabase } from './runtime-config.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const migrationId='20260101_init_moodly_schema';
const colors={'black':'#111111','#000000':'#111111','#111111':'#111111','white':'#FFFFFF','bone':'#FFFFFF','ivory':'#FFFFFF','cream':'#FFFFFF','#ffffff':'#FFFFFF','beige':'#D2B48C','sand':'#D2B48C','tan':'#D2B48C','#d2b48c':'#D2B48C'};
function normalizeColors(value){return [...new Set((Array.isArray(value)?value:[]).map(item=>colors[String(typeof item==='object'?item.hex??item.name:item).toLowerCase()]).filter(Boolean))];}
function normalizeCategory(value){const key=String(value??'').toLowerCase().replaceAll('_','-');return ['down-shoulder','everyday','classic','polo'].includes(key)?key:['oversized','drop-shoulder'].includes(key)?'down-shoulder':key==='daily'?'everyday':'classic';}
function slug(value){return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,140);}
function legacyId(value){const original=String(value);if(/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(original))return original;const chars=createHash('sha256').update(`moodly-legacy:${original}`).digest('hex').slice(0,32).split('');chars[12]='4';chars[16]='8';const s=chars.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
function plainMigration(value){return value.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,'');}
const phoneValue=value=>{const digits=String(value??'').replace(/\D/g,'');return /^[6-9]\d{9}$/.test(digits)?`91${digits}`:/^[1-9]\d{9,14}$/.test(digits)?digits:'';};
export async function setupDatabase(env=process.env){
  if(env.NODE_ENV==='production')return {skipped:'Production never auto-migrates or seeds the shared development database.'};
  if(env.MOODLY_DEMO_MODE==='true'||!env.DATABASE_URL)return {skipped:'Local JSON demo or no direct database connection.'};
  const config=databaseOptions(env);const sql=postgres(config.url,{...config.options,max:1,onnotice:()=>{}});
  const summary={schemaCreated:false,archivedTables:[],importedProducts:0,sharedTestDatabase:isSharedTestDatabase(env),poolerHost:new URL(config.url).hostname};
  try{
    const source=await readFile(path.join(root,'supabase/migrations/20260101_init_moodly_schema.sql'),'utf8');
    await sql.begin(async tx=>{
      await tx`select pg_advisory_xact_lock(601012026)`;
      await tx.unsafe(`create table if not exists public.moodly_migrations(id text primary key,applied_at timestamptz not null default now());alter table public.moodly_migrations enable row level security;revoke all on public.moodly_migrations from public,anon,authenticated;grant all on public.moodly_migrations to service_role;`);
      const applied=await tx`select id from public.moodly_migrations where id=${migrationId}`;
      const [{canonical}]=await tx`select
        exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='id' and data_type='uuid')
        and exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='base_price')
        and exists(select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='checkout_hash')
        and exists(select 1 from information_schema.columns where table_schema='public' and table_name='store_settings' and column_name='key') as canonical`;
      if(applied.length&&!canonical)throw new Error('The recorded Moodly schema changed unexpectedly. Automatic setup stopped without replacing it.');
      if(!canonical){
        const present=await tx`select table_name from information_schema.tables where table_schema='public' and table_name in ('products','orders','store_settings','inventory_blanks','moodly_admins')`;
        const names=new Set(present.map(row=>row.table_name));
        const previousProducts=names.has('products')?await tx`select * from public.products`:[];
        const previousStock=names.has('inventory_blanks')?await tx`select * from public.inventory_blanks`:[];
        const previousSettings=names.has('store_settings')?await tx`select * from public.store_settings`:[];
        if(names.size){
          await tx.unsafe('create schema if not exists moodly_legacy;revoke all on schema moodly_legacy from public,anon,authenticated;');
          for(const name of names){
            const exists=await tx`select to_regclass(${`moodly_legacy.${name}`}) as table_exists`;
            if(exists[0].table_exists)throw new Error(`A prior ${name} archive already exists. No table was overwritten; review that archive before migration.`);
            await tx.unsafe(`alter table public."${name}" set schema moodly_legacy`);summary.archivedTables.push(name);
          }
        }
        await tx.unsafe(plainMigration(source));summary.schemaCreated=true;
        for(const old of previousProducts){
          const category=normalizeCategory(old.category);let palette=normalizeColors(old.colors);if(!palette.length)palette=['#111111'];
          const fallback=category==='polo'?'/images/polo-black.jpg':'/images/tee-black.jpg';
          const images=(Array.isArray(old.images)?old.images:[]).map(image=>typeof image==='string'?image:image?.url).filter(image=>typeof image==='string'&&(/^https:\/\//.test(image)||/^\/images\//.test(image))).slice(0,8);
          const title=String(old.title??'Legacy essential').trim().slice(0,120);const price=Math.max(1,Math.min(100000,Math.round(Number(old.base_price??old.price)||799)));
          const data={id:legacyId(old.id),title:title.length>=3?title:`Legacy ${title}`,slug:slug(old.slug??title)||`legacy-${legacyId(old.id)}`,category,base_price:price,mrp:Math.max(price,Math.min(200000,Math.round(Number(old.mrp??old.original_price)||price))),description:old.description??'',fabric_details:old.fabric_details??'240 GSM cotton tee blank',images:tx.array(images.length?images:[fallback]),colors:tx.array(palette),is_active:old.is_active!==false};
          const rows=await tx`insert into public.products ${tx(data)} on conflict do nothing returning id`;summary.importedProducts+=rows.length;
        }
        for(const old of previousStock){
          const key=String(old.color_name??'').toLowerCase();const hex=colors[key];const colorName=hex==='#111111'?'Black':hex==='#FFFFFF'?'White':hex==='#D2B48C'?'Beige':null;
          if(!colorName||!['S','M','L','XL','XXL'].includes(old.size))continue;
          await tx`update public.inventory_blanks set is_in_stock=${old.is_in_stock!==false},stock_count=${Math.max(0,Math.floor(Number(old.stock_count)||0))} where color_name=${colorName} and size=${old.size}`;
        }
        const oldSettings=previousSettings.find(row=>row.whatsapp_number!==undefined);
        if(oldSettings){
          const number=phoneValue(oldSettings.whatsapp_number);if(number)await tx`update public.store_settings set value=${tx.json(number)}::jsonb where key='whatsapp_number'`;
          if(Number.isInteger(oldSettings.pickup_discount))await tx`update public.store_settings set value=${tx.json(Math.max(0,Math.min(1000,oldSettings.pickup_discount)))}::jsonb where key='pickup_discount'`;
        }
      }else{
        const functionSQL=source.slice(source.indexOf('-- Deadlock-safe stock return'),source.indexOf('-- Public product images'));
        await tx.unsafe(functionSQL);
        await tx.unsafe(`create table if not exists public.moodly_admins(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());alter table public.moodly_admins enable row level security;`);
      }
      await tx`insert into public.moodly_migrations(id) values(${migrationId}) on conflict do nothing`;
      await tx.unsafe(await readFile(path.join(root,'supabase/seed.sql'),'utf8'));
      const supportId='20261006_catalogue_support';
      const supportApplied=await tx`select id from public.moodly_migrations where id=${supportId}`;
      if(!supportApplied.length){await tx.unsafe(plainMigration(await readFile(path.join(root,'supabase/migrations/20261006_catalogue_support.sql'),'utf8')));await tx`insert into public.moodly_migrations(id) values(${supportId})`;}

      await tx.unsafe(`insert into public.inventory_blanks(color_name,size) select color_name,size from unnest(array['Black','White','Beige']) color_name cross join unnest(array['S','M','L','XL','XXL']) size on conflict(color_name,size) do nothing;`);
      const number=phoneValue(env.NEXT_PUBLIC_WHATSAPP_NUMBER);
      if(number)await tx`update public.store_settings set value=${tx.json(number)}::jsonb,updated_at=now() where key='whatsapp_number' and (value #>> '{}')=''`;
      await tx.unsafe("notify pgrst, 'reload schema'");
    });
    return summary;
  }finally{await sql.end({timeout:2});}
}
async function main(){
  loadEnvConfig(root,true);
  const result=await setupDatabase();
  console.log('[Moodly] Development database setup:',JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error('[Moodly] Database setup failed:',error.code??'SETUP_ERROR',String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[connection redacted]'));process.exit(1);});
