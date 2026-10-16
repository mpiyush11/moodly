import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_PRODUCTS,SEED_INVENTORY,SEED_SETTINGS } from '../src/lib/catalog';
import { verifiedQuote } from '../src/lib/commerce';
import { designCode,whatsappRequestUrl,customPrintDraft } from '../src/lib/request';
test('WhatsApp request uses a verified quote but never claims payment, reservation or confirmation',()=>{
 const input=[{productId:SEED_PRODUCTS[0].id,color:'#111111' as const,size:'M' as const,qty:2}];const quote=verifiedQuote(input,'JAIPUR_PICKUP',SEED_PRODUCTS,SEED_INVENTORY,SEED_SETTINGS);
 const before=structuredClone(SEED_INVENTORY);const url=new URL(whatsappRequestUrl(quote,'919000000000','Jaipur'));assert.equal(url.origin,'https://wa.me');const text=url.searchParams.get('text')!;
 assert.match(text,/not a confirmed order/);assert.match(text,/Colour: Black \| Size: M \| Quantity: 2/);assert.match(text,/₹1538/);assert.match(text,/does not reserve stock/);assert.doesNotMatch(text,/I placed order|share the UPI QR code/);assert.deepEqual(SEED_INVENTORY,before);
});
test('design codes are stable and distinct across template products',()=>{const codes=SEED_PRODUCTS.map(designCode);assert.equal(new Set(codes).size,codes.length);assert.match(codes[0],/^D-[A-F0-9]{6}$/);});
test('custom print draft contains 240 GSM, required brief fields and licensed-artwork acknowledgement',()=>{const text=new URL(customPrintDraft('919000000000',{colour:'White',size:'L',qty:3,placement:'Back',city:'Jaipur'})).searchParams.get('text')!;assert.match(text,/240 GSM/);assert.match(text,/Size: L/);assert.match(text,/Quantity: 3/);assert.match(text,/Print placement: Back/);assert.match(text,/attach my design/);assert.match(text,/permission/);});
