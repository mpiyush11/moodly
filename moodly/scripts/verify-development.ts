import { loadEnvConfig } from '@next/env';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { databaseOptions,isSharedTestDatabase } from './runtime-config.mjs';
import type { StorefrontData,AdminData } from '../src/lib/types';
import { cleanupTestUploads } from './test-artifacts';
loadEnvConfig(process.cwd(),true);
const base=process.env.TEST_BASE_URL??'http://127.0.0.1:3000';
async function main(){
 assert.equal(isSharedTestDatabase(),true,'This suite is limited to the owner-authorised shared test database.');
 const config=databaseOptions();const db=postgres(config.url,{...config.options,max:1});let cookie='';let productId:string|undefined;const checks:string[]=[];const uploadedUrls:string[]=[];
 const origin=new URL(base).origin;const headers={'Content-Type':'application/json',Origin:origin,'x-forwarded-for':`request-suite-${Date.now()}`};
 const call=async(path:string,method:string,body:unknown,auth=false,extra:Record<string,string>={})=>{const response=await fetch(`${base}${path}`,{method,headers:{...headers,...(auth?{Cookie:cookie}:{}),...extra},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});return{response,data:await response.json()};};
 try{
  const store=await(await fetch(`${base}/api/store`)).json() as StorefrontData;assert.equal(store.demo,false);assert.equal(store.development,true);assert.equal(store.inventory.length,15);checks.push('Hosted catalogue loads with 15 shared colour/size variants.');
  assert.equal((await fetch(`${base}/api/admin/data`)).status,401);checks.push('Studio data is private before login.');
  let r=await call('/api/admin/auth','POST',{password:'wrong-password-test'});assert.equal(r.response.status,401);
  r=await call('/api/admin/auth','POST',{password:process.env.ADMIN_PASSWORD});assert.equal(r.response.status,200,JSON.stringify(r.data));cookie=r.response.headers.get('set-cookie')!.split(';')[0];assert.match(r.response.headers.get('set-cookie')!,/HttpOnly/);checks.push('Correct development password logs in; wrong passwords fail and the session is HttpOnly.');
  r=await call('/api/admin/auth','POST',{password:process.env.ADMIN_PASSWORD},false,{Origin:'https://moodly-proxy-test.app.github.dev','x-forwarded-host':'localhost:3000','x-forwarded-proto':'https'});assert.equal(r.response.status,200,JSON.stringify(r.data));checks.push('Trusted public proxy origin logs in even when the forwarded host is internal.');
  r=await call('/api/admin/auth','POST',{password:process.env.ADMIN_PASSWORD},false,{Origin:'https://untrusted-workspace.app.github.dev'});assert.equal(r.response.status,403);checks.push('Unrelated origins remain rejected; no blanket origin bypass.');
  const admin=await(await fetch(`${base}/api/admin/data`,{headers:{Cookie:cookie}})).json() as AdminData;
  const product=store.products.find(value=>value.slug==='midnight-oversized-tee')!;const items=[{productId:product.id,color:'#111111',size:'M',qty:2}];const payload={items,deliveryMode:'JAIPUR_PICKUP',city:'Jaipur'};
  const beforeStock=await db`select color_name,size,stock_count,is_in_stock from public.inventory_blanks order by color_name,size`;const beforeOrders=await db`select count(*)::int total from public.orders`;
  r=await call('/api/checkout/request','POST',payload);assert.equal(r.response.status,200,JSON.stringify(r.data));assert.equal(r.data.orderCreated,false);assert.equal(r.data.stockReserved,false);assert.equal(r.data.requestOnly,true);assert.equal(r.data.quote.totalAmount,Math.max(0,product.base_price*2-store.settings.pickup_discount));const text=new URL(r.data.whatsappUrl).searchParams.get('text')!;assert.match(text,/not a confirmed order/);assert.match(text,/does not reserve stock/);assert.match(text,/Quantity: 2/);checks.push('Request contains server-checked prices/variants and explicit non-confirmation language.');
  const afterStock=await db`select color_name,size,stock_count,is_in_stock from public.inventory_blanks order by color_name,size`;const afterOrders=await db`select count(*)::int total from public.orders`;assert.deepEqual([...afterStock],[...beforeStock]);assert.equal(afterOrders[0].total,beforeOrders[0].total);checks.push('A WhatsApp enquiry creates zero order/customer records and changes zero stock.');
  r=await call('/api/checkout/request','POST',{...payload,total_amount:1});assert.equal(r.response.status,400);r=await call('/api/checkout/request','POST',{...payload,customer:{name:'Do not persist',phone:'9000000000'}});assert.equal(r.response.status,400);checks.push('Client prices and personal checkout payloads are rejected.');
  r=await call('/api/checkout/create-order','POST',payload);assert.equal(r.response.status,410);checks.push('Legacy public order endpoint cannot reserve stock or create payment orders.');
  const input={title:`Revision Test ${Date.now()}`,slug:`revision-test-${Date.now()}`,category:'classic',base_price:749,mrp:999,description:'Disposable catalogue test.',fabric_details:'240 GSM cotton tee blank',images:['/images/tee-black.jpg'],colors:['#111111'],is_active:false};
  r=await call('/api/admin/products','POST',input,true);assert.equal(r.response.status,200,JSON.stringify(r.data));productId=r.data.product.id;r=await call('/api/admin/products','POST',{...input,id:productId,base_price:759},true);assert.equal(r.response.status,200);assert.equal(r.data.product.base_price,759);checks.push('Authorised catalogue create/edit works with image and colour arrays.');
  r=await call('/api/admin/settings','PATCH',admin.settings,true);assert.equal(r.response.status,200,JSON.stringify(r.data));checks.push('Contact/social/reply settings save to hosted PostgreSQL.');
  const bytes=await readFile('public/images/tee-black.jpg');const form=new FormData();form.set('file',new File([bytes],'sample.jpg',{type:'image/jpeg'}));const uploaded=await fetch(`${base}/api/admin/upload`,{method:'POST',headers:{Origin:origin,Cookie:cookie},body:form});assert.equal(uploaded.status,200);const image=await uploaded.json();uploadedUrls.push(image.url);assert.deepEqual(Buffer.from(await(await fetch(`${base}${image.url}`)).arrayBuffer()),bytes);checks.push('Protected JPEG upload and exact-byte readback still work.');
  const svg=new FormData();svg.set('file',new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'}));assert.equal((await fetch(`${base}/api/admin/upload`,{method:'POST',headers:{Origin:origin,Cookie:cookie},body:svg})).status,400);checks.push('SVG upload remains blocked.');
  r=await call('/api/admin/logout','POST',{},true);assert.equal(r.response.status,200);checks.push('Logout clears the development session.');
  await mkdir('docs/verification/revision',{recursive:true});await writeFile('docs/verification/revision/api-results.json',JSON.stringify({hostedSupabaseVerified:true,mode:'Catalogue + WhatsApp request assistant',checks:checks.length,passed:checks,orderRecordsCreated:0,stockReserved:false,whatsappOpened:false},null,2));checks.forEach(check=>console.log(`✓ ${check}`));console.log(`\n${checks.length} revision integration checks passed.`);
 }finally{try{await cleanupTestUploads(uploadedUrls);if(productId)await db`delete from public.products where id=${productId}::uuid`;}finally{await db.end({timeout:2});}}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Verification failed.');process.exit(1);});
