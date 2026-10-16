import { z } from 'zod';
import { CATEGORIES, SIZES, ORDER_STATUSES } from './types';
const colorSchema = z.preprocess(value => {
  if (typeof value !== 'string') return value;
  const names: Record<string, string> = { black: '#111111', white: '#FFFFFF', beige: '#D2B48C' };
  return names[value.toLowerCase()] ?? value.toUpperCase();
}, z.enum(['#111111', '#FFFFFF', '#D2B48C']));
export const checkoutItemSchema = z.object({ productId: z.string().uuid(), size: z.enum(SIZES), color: colorSchema, qty: z.number().int().min(1).max(10) }).strict();
export const quoteSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'Your bag is empty.').max(20),
  deliveryMode: z.enum(['PAN_INDIA', 'JAIPUR_PICKUP']),
}).strict().refine(data => data.items.reduce((sum, item) => sum + item.qty, 0) <= 50, 'A maximum of 50 pieces is allowed per selection.');
export const requestSchema=z.object({items:z.array(checkoutItemSchema).min(1).max(20),deliveryMode:z.enum(['PAN_INDIA','JAIPUR_PICKUP']),city:z.string().trim().max(80).regex(/^[\p{L}\p{M} .'-]*$/u,'Enter a valid city.').optional().default('')}).strict().refine(value=>value.items.reduce((sum,item)=>sum+item.qty,0)<=50,'A maximum of 50 pieces is allowed per request.');
const imageUrl = z.string().max(2048).refine(url => /^https:\/\/[^\s]+$/.test(url) || /^\/images\/[a-zA-Z0-9._/-]+$/.test(url), 'Use an HTTPS image URL or an existing local image path.');
export const productSchema = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(3).max(120),
  slug: z.string().min(3).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), category: z.enum(CATEGORIES),
  base_price: z.number().int().min(1).max(100000), mrp: z.number().int().min(1).max(200000),
  description: z.string().trim().max(3000), fabric_details: z.string().trim().min(3).max(200),
  images: z.array(imageUrl).min(1).max(8), colors: z.array(z.enum(['#111111', '#FFFFFF', '#D2B48C'])).min(1).max(3),
  is_active: z.boolean(),
}).strict().refine(p => p.mrp >= p.base_price, 'MRP cannot be lower than the selling price.');
export const stockSchema = z.object({ colorName: z.enum(['Black', 'White', 'Beige']), size: z.enum(SIZES), isInStock: z.boolean(), stockCount: z.number().int().min(0).max(100000).optional() }).strict();
export const settingsSchema = z.object({
  whatsapp_number: z.string().regex(/^(91)?[6-9]\d{9}$/, 'Use a 10-digit Indian mobile number or prefix it with 91.').transform(phone => phone.length === 10 ? `91${phone}` : phone),
  pickup_discount: z.number().int().min(0).max(1000),
  banner_images: z.array(imageUrl).length(3),
  instagram_url:z.string().max(2048).refine(value=>!value||/^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._/-]+\/?$/.test(value),'Use a real https://instagram.com/your-profile link.').optional(),
  whatsapp_catalog_url:z.string().max(2048).refine(value=>!value||/^https:\/\/wa\.me\/c\/[1-9]\d{9,14}$/.test(value),'Use a real https://wa.me/c/business-number catalogue link.').optional(),
  reply_hours:z.string().trim().max(300).optional(),
  dispatch_note:z.string().trim().max(500).optional(),
}).strict();
export const statusSchema = z.object({ orderId: z.string().uuid(), status: z.enum(ORDER_STATUSES) }).strict();
export const loginSchema = z.object({ email: z.string().email().max(254).optional().default('studio@moodly.local'), password: z.string().min(8).max(128) }).strict();
