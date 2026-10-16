export const CATEGORIES = ['down-shoulder', 'everyday', 'classic', 'polo'] as const;
export type Category = typeof CATEGORIES[number];
export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type Size = typeof SIZES[number];
export const COLORS = { '#111111': 'Black', '#FFFFFF': 'White', '#D2B48C': 'Beige' } as const;
export type ColorHex = keyof typeof COLORS;
export type ColorName = typeof COLORS[ColorHex];
export type DeliveryMode = 'PAN_INDIA' | 'JAIPUR_PICKUP';
export const ORDER_STATUSES = ['PENDING_PAYMENT', 'PAID', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
export interface Product {
  id: string;
  title: string;
  slug: string;
  category: Category;
  base_price: number;
  mrp: number;
  description: string | null;
  fabric_details: string;
  images: string[];
  colors: ColorHex[];
  is_active: boolean;
  created_at: string;
}
export interface InventoryBlank {
  id: string;
  color_name: ColorName;
  size: Size;
  is_in_stock: boolean;
  stock_count: number;
}
export interface StoreSettings {
  whatsapp_number: string;
  banner_images: string[];
  pickup_discount: number;
  instagram_url?: string;
  whatsapp_catalog_url?: string;
  reply_hours?: string;
  dispatch_note?: string;
}
export interface CheckoutItem { productId: string; size: Size; color: ColorHex; qty: number }
export interface VerifiedItem {
  product_id: string;
  title: string;
  size: Size;
  color: ColorName;
  color_hex: ColorHex;
  qty: number;
  unit_price: number;
  image: string;
}
export interface Quote {
  items: VerifiedItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  deliveryMode: DeliveryMode;
  currency: 'INR';
}
export interface Order {
  id: string;
  order_code: string;
  customer_name: string;
  whatsapp_number: string;
  city: string;
  pincode: string;
  delivery_mode: DeliveryMode;
  items: VerifiedItem[];
  discount_amount: number;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  reservation_expires_at: string;
  inventory_reserved: boolean;
  idempotency_key: string;
  checkout_hash: string;
}
export interface StorefrontData { products: Product[]; inventory: InventoryBlank[]; settings: StoreSettings; demo: boolean; development?: boolean }
export interface AdminData extends StorefrontData { orders: Order[] }
export interface BagItem extends CheckoutItem { product: Product }
