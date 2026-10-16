// Retain the command name, but verify the active no-reservation request model.
import { loadEnvConfig } from '@next/env';
import assert from 'node:assert/strict';
import type { StorefrontData } from '../src/lib/types';
loadEnvConfig(process.cwd(),true);
async function main(){
 if(process.env.ALLOW_LIVE_TEST_REQUEST!=='true')throw new Error('This command is opt-in: set ALLOW_LIVE_TEST_REQUEST=true and TEST_BASE_URL to your authorised website. It will prepare a non-binding request, not place an order.');
 const base=process.env.TEST_BASE_URL??'http://127.0.0.1:3000';const origin=new URL(base).origin;
 const before=await(await fetch(`${base}/api/store`)).json() as StorefrontData;
 const product=before.products.find(p=>before.inventory.some(s=>s.is_in_stock&&s.stock_count>0&&p.colors.some(c=>({'#111111':'Black','#FFFFFF':'White','#D2B48C':'Beige'}[c])===s.color_name)));if(!product)throw new Error('No available catalogue variant.');
 const stock=before.inventory.find(s=>s.is_in_stock&&s.stock_count>0&&product.colors.some(c=>({'#111111':'Black','#FFFFFF':'White','#D2B48C':'Beige'}[c])===s.color_name))!;const color=product.colors.find(c=>({'#111111':'Black','#FFFFFF':'White','#D2B48C':'Beige'}[c])===stock.color_name)!;
 const response=await fetch(`${base}/api/checkout/request`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({items:[{productId:product.id,color,size:stock.size,qty:1}],deliveryMode:'PAN_INDIA'})});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));assert.equal(data.orderCreated,false);assert.equal(data.stockReserved,false);assert.equal(data.quote.totalAmount,product.base_price);assert.equal(new URL(data.whatsappUrl).origin,'https://wa.me');const after=await(await fetch(`${base}/api/store`)).json() as StorefrontData;assert.deepEqual(after.inventory.map(s=>[s.id,s.stock_count]),before.inventory.map(s=>[s.id,s.stock_count]));console.log('✓ Authorised request checked: server price, valid draft, unchanged stock, no order or payment. WhatsApp was not opened.');
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Verification failed.');process.exitCode=1;});
