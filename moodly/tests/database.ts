import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile,writeFile } from 'node:fs/promises';
import { randomUUID,createHash } from 'node:crypto';
import assert from 'node:assert/strict';
async function main() {
const db=new PGlite({extensions:{pgcrypto}});
const checks:string[]=[];
async function check(label:string,run:()=>Promise<void>){await run();checks.push(label);console.log(`✓ ${label}`);}
const admin='a0000000-0000-4000-8000-000000000001';const normal='a0000000-0000-4000-8000-000000000002';
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    grant all on storage.objects,storage.buckets to service_role;
    grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  await check('Unmodified Supabase migration executes on PostgreSQL with pgcrypto',async()=>{await db.exec(await readFile('supabase/migrations/20260101_init_moodly_schema.sql','utf8'));});
  await db.exec(await readFile('supabase/seed.sql','utf8'));
  const product='00000000-0000-4000-8000-000000000001';
  const customer={name:'Aarav Sharma',phone:'9876543210',city:'Jaipur',pincode:'302001'};
  const items=[{productId:product,size:'M',color:'#111111',qty:2}];
  const hash=createHash('sha256').update('database-test-checkout').digest('hex');
  const rpc=async(list:unknown,who=customer,mode='JAIPUR_PICKUP',key=randomUUID(),digest=hash)=>{
    const result=await db.query<{result:{order:{id:string;order_code:string;total_amount:number;discount_amount:number;items:{unit_price:number}[];status:string};business_phone:string}}>('select public.create_moodly_order($1::jsonb,$2::jsonb,$3,$4::uuid,$5) result',[JSON.stringify(list),JSON.stringify(who),mode,key,digest]);return result.rows[0].result;
  };
  await check('Live checkout blocks an unconfigured business number and writes nothing',async()=>{
    await assert.rejects(()=>rpc(items),/not configured/);assert.equal((await db.query<{count:number}>('select count(*)::int count from public.orders')).rows[0].count,0);
  });
  await db.exec(`update public.store_settings set value='"919000000000"' where key='whatsapp_number';
    insert into auth.users(id) values('${admin}'),('${normal}');insert into public.moodly_admins(user_id) values('${admin}');`);
  await check('Public read policies expose only active catalog, stock, and settings',async()=>{
    await db.exec(`update public.products set is_active=false where id='00000000-0000-4000-8000-000000000012';set role anon;`);
    assert.equal((await db.query('select * from public.products')).rows.length,11);assert.equal((await db.query('select * from public.inventory_blanks')).rows.length,15);assert.equal((await db.query('select * from public.store_settings')).rows.length,3);
    await assert.rejects(()=>db.query('select * from public.orders'),/permission denied/);
    await assert.rejects(()=>rpc(items),/permission denied/);await db.exec('reset role;');
  });
  await check('A normal authenticated user cannot write catalog or access another admin membership',async()=>{
    await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${normal}',false);`);
    assert.equal((await db.query('select * from public.moodly_admins')).rows.length,0);
    assert.equal((await db.query(`update public.products set base_price=1 where id='${product}' returning id`)).rows.length,0);
    await assert.rejects(()=>db.query(`insert into public.products(title,slug,category,base_price,mrp,images,colors) values('Forged item','forged-item','classic',1,1,array['/images/x.jpg'],array['#111111'])`),/row-level security/);
    await assert.rejects(()=>rpc(items),/permission denied/);await db.exec('reset role;');
  });
  await check('Only provisioned admins see inactive catalog; even admins cannot directly write orders',async()=>{
    await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${admin}',false);`);
    assert.equal((await db.query('select * from public.products')).rows.length,12);
    assert.equal((await db.query(`update public.products set base_price=799 where id='${product}' returning id`)).rows.length,1);
    await assert.rejects(()=>db.query("insert into public.orders(order_code) values('#MDLY-FAKE')"),/permission denied/);await db.exec('reset role;set role service_role;');
  });
  const key=randomUUID();let orderId='';
  await check('Secure RPC persists ₹1,538 pickup order at ₹799 × 2 and reserves stock atomically',async()=>{
    const result=await rpc(items,customer,'JAIPUR_PICKUP',key);orderId=result.order.id;assert.equal(result.order.total_amount,1538);assert.equal(result.order.discount_amount,60);assert.equal(result.order.items[0].unit_price,799);assert.equal(result.order.status,'PENDING_PAYMENT');assert.match(result.order.order_code,/^#MDLY-[A-Z0-9]{4}$/);
    assert.equal((await db.query<{stock_count:number}>("select stock_count from public.inventory_blanks where color_name='Black' and size='M'")).rows[0].stock_count,48);
  });
  await check('Idempotent retry returns the same order without a second stock deduction',async()=>{
    assert.equal((await rpc(items,customer,'JAIPUR_PICKUP',key)).order.id,orderId);
    assert.equal((await db.query<{count:number}>('select count(*)::int count from public.orders')).rows[0].count,1);
    await assert.rejects(()=>rpc(items,customer,'JAIPUR_PICKUP',key,'f'.repeat(64)),/different checkout/);
  });
  await check('RPC ignores a forged item price and reads current database price',async()=>{
    await db.exec(`reset role;update public.products set base_price=849 where id='${product}';set role service_role;`);
    const result=await rpc([{...items[0],qty:1,unit_price:1}],{...customer,phone:'9876543211'},'PAN_INDIA');assert.equal(result.order.total_amount,849);assert.equal(result.order.items[0].unit_price,849);
  });
  await check('Insufficient shared stock rolls the entire transaction back',async()=>{
    await db.exec("update public.inventory_blanks set stock_count=3 where color_name='Black' and size='L'");
    const count=(await db.query<{count:number}>('select count(*)::int count from public.orders')).rows[0].count;
    await assert.rejects(()=>rpc([{...items[0],size:'L'},{...items[0],productId:'00000000-0000-4000-8000-000000000004',size:'L'}]),/out of stock/);
    assert.equal((await db.query<{stock_count:number}>("select stock_count from public.inventory_blanks where color_name='Black' and size='L'")).rows[0].stock_count,3);
    assert.equal((await db.query<{count:number}>('select count(*)::int count from public.orders')).rows[0].count,count);
  });
  await check('A disabled blank rejects checkout without partial order writes',async()=>{
    await db.exec("update public.inventory_blanks set is_in_stock=false where color_name='White' and size='S'");
    await assert.rejects(()=>rpc([{...items[0],color:'#FFFFFF',size:'S',qty:1}]),/out of stock/);
  });
  await check('Competing demand cannot oversell the last blank',async()=>{
    await db.exec("update public.inventory_blanks set stock_count=1 where color_name='Black' and size='XL'");
    const outcomes=await Promise.allSettled([rpc([{...items[0],size:'XL',qty:1}],{...customer,phone:'9876543212'},'PAN_INDIA'),rpc([{...items[0],size:'XL',qty:1}],{...customer,phone:'9876543213'},'PAN_INDIA')]);
    assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);assert.equal((await db.query<{stock_count:number}>("select stock_count from public.inventory_blanks where color_name='Black' and size='XL'")).rows[0].stock_count,0);
  });
  await check('Cancellation returns reserved stock exactly once and rejects invalid transitions',async()=>{
    const before=(await db.query<{stock_count:number}>("select stock_count from public.inventory_blanks where color_name='Black' and size='M'")).rows[0].stock_count;
    await db.query('select public.set_moodly_order_status($1::uuid,$2)',[orderId,'CANCELLED']);await db.query('select public.set_moodly_order_status($1::uuid,$2)',[orderId,'CANCELLED']);
    assert.equal((await db.query<{stock_count:number}>("select stock_count from public.inventory_blanks where color_name='Black' and size='M'")).rows[0].stock_count,before+2);
    await assert.rejects(()=>db.query('select public.set_moodly_order_status($1::uuid,$2)',[orderId,'PAID']),/Invalid order status/);
  });
  await check('Expiry cancels pending reservations and restores stock',async()=>{
    const pending=(await rpc([{...items[0],size:'XXL',qty:1}],{...customer,phone:'9876543214'},'PAN_INDIA')).order;
    await db.exec(`update public.orders set reservation_expires_at=now()-interval '1 minute' where id='${pending.id}'`);
    await assert.rejects(()=>db.query('select public.set_moodly_order_status($1::uuid,$2)',[pending.id,'PAID']),/expired/);
    await db.query('select public.expire_moodly_reservations()');
    assert.equal((await db.query<{status:string}>('select status from public.orders where id=$1',[pending.id])).rows[0].status,'CANCELLED');
    assert.equal((await db.query<{stock_count:number}>("select stock_count from public.inventory_blanks where color_name='Black' and size='XXL'")).rows[0].stock_count,50);
  });
  await writeFile('docs/verification/revision/database-results.json',JSON.stringify({engine:'PGlite / real PostgreSQL + pgcrypto',migration:'Unmodified Supabase migration; auth and storage schemas supplied by the test harness',checks:checks.length,passed:checks,liveSupabaseTest:false},null,2));
  console.log(`\n${checks.length} PostgreSQL checks passed. Run test:development for the separate hosted shared-project integration suite.`);
} finally {await db.close();}

}
main().catch(error=>{console.error(error);process.exit(1);});
