import 'server-only';
import { cache } from 'react';
import { randomUUID } from 'node:crypto';
import { CommerceError, verifiedQuote } from '@/lib/commerce';
import { type AdminData, type CheckoutItem, type DeliveryMode, type InventoryBlank, type Product, type Order, type StoreSettings, type StorefrontData } from '@/lib/types';
import { statusTransitions } from '@/lib/utils';
import { isDemo, publicSupabase, serviceSupabase } from '@/lib/supabase/server';
import { demoTransaction } from './demo';
import { hasDatabaseConnection,databaseCall } from './postgres';
import { isDevelopmentAdmin } from './development';
function settingsFrom(rows: { key: string; value: unknown }[]): StoreSettings {
  const values = Object.fromEntries(rows.map(row => [row.key, row.value]));
  return { whatsapp_number: String(values.whatsapp_number ?? ''), banner_images: Array.isArray(values.banner_images) ? values.banner_images as string[] : [], pickup_discount: Number(values.pickup_discount ?? 60),instagram_url:String(values.instagram_url??''),whatsapp_catalog_url:String(values.whatsapp_catalog_url??''),reply_hours:String(values.reply_hours??'We reply during available hours. Your request is not an instant order confirmation.'),dispatch_note:String(values.dispatch_note??'Printing feasibility and dispatch timing are confirmed on WhatsApp before payment.') };
}
function dbError(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (['P0001', '22023', '23505', '23514', '22P02'].includes(error.code ?? '')) throw new CommerceError(error.message, 409, 'CHECKOUT_CONFLICT');
  console.error('[Moodly database]', error.code, error.message);
  throw new CommerceError('The studio is temporarily unavailable. Please try again.', 503, 'DATABASE_UNAVAILABLE');
}
export const getStorefront=cache(async ():Promise<StorefrontData>=>{
  if (isDemo()) return demoTransaction(data => ({ products: data.products.filter(p => p.is_active), inventory: data.inventory, settings: data.settings, demo: true }));
  if(hasDatabaseConnection())return databaseCall(async sql=>{
    // Public projection remains explicit even when the trusted server uses PostgreSQL.
    const rows=await sql<{products:Product[];inventory:InventoryBlank[];settings:{key:string;value:unknown}[]}[]>`select
      coalesce((select jsonb_agg(p order by p.created_at) from public.products p where p.is_active),'[]'::jsonb) products,
      coalesce((select jsonb_agg(i) from public.inventory_blanks i),'[]'::jsonb) inventory,
      coalesce((select jsonb_agg(jsonb_build_object('key',s.key,'value',s.value)) from public.store_settings s),'[]'::jsonb) settings`;
    const {products,inventory,settings}=rows[0];
    return {products,inventory,settings:settingsFrom(settings),demo:false,development:isDevelopmentAdmin()};
  });
  const db = publicSupabase();
  const [products, inventory, settings] = await Promise.all([
    db.from('products').select('*').eq('is_active', true).order('created_at'),
    db.from('inventory_blanks').select('*'),
    db.from('store_settings').select('key,value'),
  ]);
  dbError(products.error); dbError(inventory.error); dbError(settings.error);
  return { products: (products.data ?? []) as Product[], inventory: (inventory.data ?? []) as InventoryBlank[], settings: settingsFrom(settings.data ?? []), demo: false, development:isDevelopmentAdmin() };
});
function releaseDemoStock(data: AdminData, order: Order) {
  if (!order.inventory_reserved) return;
  order.items.forEach(item => { const stock = data.inventory.find(s => s.color_name === item.color && s.size === item.size); if (stock) stock.stock_count += item.qty; });
  order.inventory_reserved = false;
}
function expireDemo(data: AdminData) {
  data.orders.filter(o => o.status === 'PENDING_PAYMENT' && Date.parse(o.reservation_expires_at) < Date.now()).forEach(order => { releaseDemoStock(data, order); order.status = 'CANCELLED'; });
}
export async function getQuote(items: CheckoutItem[], deliveryMode: DeliveryMode) {
  const { products, inventory, settings } = await getStorefront();
  return verifiedQuote(items, deliveryMode, products, inventory, settings);
}
export async function getAdminData(): Promise<AdminData> {
  if (isDemo()) return demoTransaction(data => { expireDemo(data); return structuredClone(data); });
  if(hasDatabaseConnection())return databaseCall(async sql=>{
    await sql`select public.expire_moodly_reservations()`;
    const rows=await sql<{products:Product[];inventory:InventoryBlank[];orders:Order[];settings:{key:string;value:unknown}[]}[]>`select
      coalesce((select jsonb_agg(p order by p.created_at desc) from public.products p),'[]'::jsonb) products,
      coalesce((select jsonb_agg(i) from public.inventory_blanks i),'[]'::jsonb) inventory,
      coalesce((select jsonb_agg(jsonb_build_object('key',s.key,'value',s.value)) from public.store_settings s),'[]'::jsonb) settings,
      coalesce((select jsonb_agg(o order by o.created_at desc) from (select * from public.orders order by created_at desc limit 500) o),'[]'::jsonb) orders`;
    const {products,inventory,settings,orders}=rows[0];
    return {products,inventory,orders,settings:settingsFrom(settings),demo:false,development:isDevelopmentAdmin()};
  });
  const db = serviceSupabase();
  const expiry = await db.rpc('expire_moodly_reservations'); dbError(expiry.error);
  const [products, inventory, settings, orders] = await Promise.all([
    db.from('products').select('*').order('created_at', { ascending: false }),
    db.from('inventory_blanks').select('*'), db.from('store_settings').select('key,value'),
    db.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
  ]);
  [products, inventory, settings, orders].forEach(result => dbError(result.error));
  return { products: (products.data ?? []) as Product[], inventory: (inventory.data ?? []) as InventoryBlank[], settings: settingsFrom(settings.data ?? []), orders: (orders.data ?? []) as Order[], demo: false };
}
export async function updateStock(input: { colorName: string; size: string; isInStock: boolean; stockCount?: number }) {
  if (isDemo()) return demoTransaction(data => {
    const stock = data.inventory.find(s => s.color_name === input.colorName && s.size === input.size);
    if (!stock) throw new CommerceError('Blank not found.', 404);
    stock.is_in_stock = input.isInStock;
    if (input.stockCount !== undefined) stock.stock_count = input.stockCount;
    return stock;
  });
  if(hasDatabaseConnection())return databaseCall(async sql=>{
    const fields={is_in_stock:input.isInStock,...(input.stockCount!==undefined?{stock_count:input.stockCount}:{})};
    const rows=await sql<InventoryBlank[]>`update public.inventory_blanks set ${sql(fields)} where color_name=${input.colorName} and size=${input.size} returning *`;
    if(!rows[0])throw new CommerceError('Blank not found.',404);return rows[0];
  });
  const result = await serviceSupabase().from('inventory_blanks').update({ is_in_stock: input.isInStock, ...(input.stockCount !== undefined ? { stock_count: input.stockCount } : {}) }).eq('color_name', input.colorName).eq('size', input.size).select().single();
  dbError(result.error); return result.data;
}
export async function saveProduct(input: Omit<Product, 'created_at' | 'id'> & { id?: string }) {
  if (isDemo()) return demoTransaction(data => {
    if (data.products.some(p => p.slug === input.slug && p.id !== input.id)) throw new CommerceError('This product slug is already in use.', 409);
    const existing = input.id ? data.products.find(p => p.id === input.id) : undefined;
    if (input.id && !existing) throw new CommerceError('Product not found.', 404);
    const product: Product = { ...input, id: input.id ?? randomUUID(), created_at: existing?.created_at ?? new Date().toISOString() };
    if (existing) data.products[data.products.indexOf(existing)] = product; else data.products.unshift(product);
    return product;
  });
  if(hasDatabaseConnection())return databaseCall(async sql=>{
    const {id,...values}=input;
    const fields={...values,images:sql.array(values.images),colors:sql.array(values.colors)};
    const rows=id?await sql<Product[]>`update public.products set ${sql(fields)} where id=${id}::uuid returning *`:await sql<Product[]>`insert into public.products ${sql(fields)} returning *`;
    if(!rows[0])throw new CommerceError('Product not found.',404);return rows[0];
  });
  const db = serviceSupabase();
  const result = input.id ? await db.from('products').update(input).eq('id', input.id).select().single() : await db.from('products').insert(input).select().single();
  dbError(result.error); return result.data;
}
export async function saveSettings(input: StoreSettings) {
  if (isDemo()) return demoTransaction(data => { data.settings = input; return input; });
  if(hasDatabaseConnection())return databaseCall(async sql=>{
    await sql.begin(async tx=>{for(const [key,value] of Object.entries(input))await tx`insert into public.store_settings(key,value,updated_at) values(${key},${tx.json(value)}::jsonb,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at`;});
    return input;
  });
  const result = await serviceSupabase().from('store_settings').upsert(Object.entries(input).map(([key,value]) => ({ key,value,updated_at: new Date().toISOString() }))); dbError(result.error); return input;
}
export async function updateOrderStatus(orderId: string, status: Order['status']) {
  if (isDemo()) return demoTransaction(data => {
    expireDemo(data);
    const order = data.orders.find(o => o.id === orderId);
    if (!order) throw new CommerceError('Order not found.', 404);
    if (order.status === status) return order;
    if (!statusTransitions[order.status].includes(status)) throw new CommerceError('That status transition is not allowed.', 409);
    if (status === 'CANCELLED') releaseDemoStock(data, order);
    if (status === 'PRINTING') order.inventory_reserved = false;
    order.status = status; return order;
  });
  if(hasDatabaseConnection())return databaseCall(async sql=>{
    const rows=await sql<{result:Order}[]>`select to_jsonb(public.set_moodly_order_status(${orderId}::uuid,${status})) as result`;
    return rows[0].result;
  });
  const result = await serviceSupabase().rpc('set_moodly_order_status', { p_order_id: orderId, p_status: status }); dbError(result.error); return result.data;
}
