import { COLORS, type CheckoutItem, type DeliveryMode, type InventoryBlank, type Product, type Quote, type StoreSettings } from './types';
export class CommerceError extends Error {
  constructor(message: string, public status = 400, public code = 'INVALID_REQUEST') { super(message); this.name = 'CommerceError'; }
}
export function verifiedQuote(items: CheckoutItem[], deliveryMode: DeliveryMode, products: Product[], inventory: InventoryBlank[], settings: StoreSettings): Quote {
  const requested = new Map<string, number>();
  const verified = items.map(item => {
    const product = products.find(p => p.id === item.productId && p.is_active);
    if (!product) throw new CommerceError('A product in your bag is no longer available.', 409, 'PRODUCT_UNAVAILABLE');
    if (!product.colors.includes(item.color)) throw new CommerceError(`That colour is not available for ${product.title}.`, 409, 'COLOR_UNAVAILABLE');
    const color = COLORS[item.color];
    const key = `${color}:${item.size}`;
    requested.set(key, (requested.get(key) ?? 0) + item.qty);
    return { product_id: product.id, title: product.title, size: item.size, color, color_hex: item.color, qty: item.qty, unit_price: product.base_price, image: product.images[0] };
  });
  for (const [key, qty] of requested) {
    const [color, size] = key.split(':');
    const stock = inventory.find(s => s.color_name === color && s.size === size);
    if (!stock?.is_in_stock || stock.stock_count < qty) throw new CommerceError(`${color} / ${size} is unavailable in the requested quantity. Please choose another size.`, 409, 'OUT_OF_STOCK');
  }
  const subtotal = verified.reduce((sum, item) => sum + item.unit_price * item.qty, 0);
  const discountAmount = deliveryMode === 'JAIPUR_PICKUP' ? Math.min(settings.pickup_discount, subtotal) : 0;
  return { items: verified, subtotal, discountAmount, totalAmount: subtotal - discountAmount, deliveryMode, currency: 'INR' };
}
