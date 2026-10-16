import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_PRODUCTS, SEED_INVENTORY, SEED_SETTINGS } from '../src/lib/catalog';
import { verifiedQuote, CommerceError } from '../src/lib/commerce';
import { whatsappRequestUrl } from '../src/lib/request';
import { requestSchema, quoteSchema } from '../src/lib/validation';
import type { CheckoutItem } from '../src/lib/types';

const item: CheckoutItem = { productId: SEED_PRODUCTS[0].id, size: 'M', color: '#111111', qty: 2 };

test('catalogue quote computes integer INR amounts from live products, including ₹60 pickup saving', () => {
  assert.equal(verifiedQuote([item], 'PAN_INDIA', SEED_PRODUCTS, SEED_INVENTORY, SEED_SETTINGS).totalAmount, 1598);
  const quote = verifiedQuote([item], 'JAIPUR_PICKUP', SEED_PRODUCTS, SEED_INVENTORY, SEED_SETTINGS);
  assert.equal(quote.subtotal, 1598);
  assert.equal(quote.discountAmount, 60);
  assert.equal(quote.totalAmount, 1538);
});

test('authoritative live price changes propagate into the quote', () => {
  const products = structuredClone(SEED_PRODUCTS);
  products[0].base_price = 849;
  assert.equal(verifiedQuote([item], 'PAN_INDIA', products, SEED_INVENTORY, SEED_SETTINGS).totalAmount, 1698);
});

test('active request schema rejects forged prices, totals, discounts and personal checkout payloads', () => {
  const input = { items: [item], deliveryMode: 'PAN_INDIA' };
  assert.equal(requestSchema.safeParse({ ...input, items: [{ ...item, unit_price: 1 }] }).success, false);
  assert.equal(requestSchema.safeParse({ ...input, total_amount: 1 }).success, false);
  assert.equal(requestSchema.safeParse({ ...input, customer: { name: 'Do not collect', phone: '9000000000' } }).success, false);
  assert.equal(quoteSchema.safeParse({ ...input, deliveryMode: 'JAIPUR_PICKUP', discount: 1000 }).success, false);
});

test('inactive products, invalid variants and unavailable stock are rejected', () => {
  const products = structuredClone(SEED_PRODUCTS);
  products[0].is_active = false;
  assert.throws(() => verifiedQuote([item], 'PAN_INDIA', products, SEED_INVENTORY, SEED_SETTINGS), CommerceError);
  assert.throws(() => verifiedQuote([{ ...item, color: '#D2B48C', size: 'XXL' }], 'PAN_INDIA', SEED_PRODUCTS, SEED_INVENTORY, SEED_SETTINGS), /unavailable/);
  const oneColor = structuredClone(SEED_PRODUCTS);
  oneColor[0].colors = ['#111111'];
  assert.throws(() => verifiedQuote([{ ...item, color: '#FFFFFF' }], 'PAN_INDIA', oneColor, SEED_INVENTORY, SEED_SETTINGS), /colour/);
});

test('shared blank demand is aggregated across products and duplicate selection lines', () => {
  const inventory = structuredClone(SEED_INVENTORY);
  inventory.find(stock => stock.color_name === 'Black' && stock.size === 'M')!.stock_count = 3;
  assert.throws(() => verifiedQuote([item, { ...item, productId: SEED_PRODUCTS[3].id }], 'PAN_INDIA', SEED_PRODUCTS, inventory, SEED_SETTINGS), /requested quantity/);
});

test('pickup totals clamp at zero', () => {
  const products = structuredClone(SEED_PRODUCTS);
  products[0].base_price = 20;
  const quote = verifiedQuote([{ ...item, qty: 1 }], 'JAIPUR_PICKUP', products, SEED_INVENTORY, SEED_SETTINGS);
  assert.equal(quote.totalAmount, 0);
  assert.equal(quote.discountAmount, 20);
});

test('request validation bounds quantities/city/variants without collecting personal checkout fields', () => {
  const good = { items: [item], deliveryMode: 'PAN_INDIA' };
  assert.equal(requestSchema.parse(good).city, '');
  assert.equal(requestSchema.parse({ ...good, city: '  Jaipur  ' }).city, 'Jaipur');
  for (const qty of [-1, 0, 1.5, 11]) {
    assert.equal(requestSchema.safeParse({ ...good, items: [{ ...item, qty }] }).success, false);
  }
  for (const extra of [{ phone: '9000000000' }, { pincode: '302001' }, { name: 'No form' }, { city: 'Jaipur\nInjected' }, { city: 'x'.repeat(81) }, { deliveryMode: 'FREE' }]) {
    assert.equal(requestSchema.safeParse({ ...good, ...extra }).success, false);
  }
  assert.equal(requestSchema.safeParse({ ...good, items: Array.from({ length: 6 }, () => ({ ...item, qty: 10 })) }).success, false);
  assert.equal(requestSchema.safeParse({ ...good, items: [{ ...item, color: 'Black' }] }).success, true);
});

test('WhatsApp draft safely encodes server-verified catalogue fields and remains non-binding', () => {
  const quote = verifiedQuote([item], 'JAIPUR_PICKUP', SEED_PRODUCTS, SEED_INVENTORY, SEED_SETTINGS);
  quote.items[0].title = 'Studio & Print #1';
  const url = new URL(whatsappRequestUrl(quote, SEED_SETTINGS.whatsapp_number, 'Jaipur'));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/919000000000');
  const message = url.searchParams.get('text')!;
  assert.match(message, /Studio & Print #1/);
  assert.match(message, /Indicative catalogue amount: ₹1538/);
  assert.match(message, /Colour: Black \| Size: M \| Quantity: 2/);
  assert.match(message, /Jaipur self-pickup/);
  assert.match(message, /not a confirmed order/);
  assert.match(message, /does not reserve stock/);
  assert.equal(url.searchParams.size, 1);
  assert.throws(() => whatsappRequestUrl(quote, ''), /not configured/);
});
