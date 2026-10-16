import type { Category, InventoryBlank, Product, StoreSettings, ColorHex } from './types';
import { SIZES, COLORS } from './types';
export const CATEGORY_INFO: Record<Category, { title: string; subtitle: string; label: string; image: string; fit: string }> = {
  'down-shoulder': { title: 'Down Shoulder', subtitle: 'A little room. A lot of attitude.', label: 'Oversized, understated.', image: '/images/tee-black.jpg', fit: 'Oversized fit' },
  everyday: { title: 'Everyday Tees', subtitle: 'Your daily, done better.', label: 'On repeat. For a reason.', image: '/images/tee-bone.jpg', fit: 'Relaxed fit' },
  classic: { title: 'Classic T-Shirts', subtitle: 'The original. Refined.', label: 'Never not in style.', image: '/images/tee-sand.jpg', fit: 'Regular fit' },
  polo: { title: 'Polo T-Shirts', subtitle: 'Clean collar. Quiet confidence.', label: 'A little more put-together.', image: '/images/polo-black.jpg', fit: 'Regular fit' },
};
export const COLOR_PHOTOS: Record<ColorHex, string> = {
  '#111111': '/images/tee-black.jpg', '#FFFFFF': '/images/tee-bone.jpg', '#D2B48C': '/images/tee-sand.jpg',
};
export const POLO_PHOTOS: Record<ColorHex, string> = {
  '#111111': '/images/polo-black.jpg', '#FFFFFF': '/images/polo-bone.jpg', '#D2B48C': '/images/polo-sand.jpg',
};
export function variantImage(product: Product, color: ColorHex) {
  // Seed assets have photographed variants. Uploaded catalog assets remain the source of truth.
  return [...Object.values(COLOR_PHOTOS), ...Object.values(POLO_PHOTOS)].includes(product.images[0]) ? (product.category === 'polo' ? POLO_PHOTOS[color] : COLOR_PHOTOS[color]) : product.images[0];
}
const palettes: ColorHex[] = ['#111111', '#FFFFFF', '#D2B48C'];
export const SEED_PRODUCTS: Product[] = (Object.keys(CATEGORY_INFO) as Category[]).flatMap((category, index) => palettes.map((color, j) => {
  const tone = ['Midnight', 'Bone', 'Sand'][j];
  const name = ['Oversized Tee', 'Everyday Crew', 'Classic Tee', 'Essential Polo'][index];
  const price = [799, 599, 649, 899][index];
  const photo = category === 'polo' ? POLO_PHOTOS[color] : COLOR_PHOTOS[color];
  const back = ['/images/tee-black-back.jpg', '/images/tee-bone-back.jpg', '/images/tee-sand-detail.jpg'][j];
  return {
    id: `00000000-0000-4000-8000-${String(index * 3 + j + 1).padStart(12, '0')}`,
    title: `${tone} ${name}`,
    slug: `${tone.toLowerCase()}-${name.toLowerCase().replaceAll(' ', '-')}`,
    category, base_price: price, mrp: [1199, 899, 999, 1299][index],
    description: `${category === 'down-shoulder' ? 'An easy, oversized silhouette with dropped shoulders and room to move.' : category === 'polo' ? 'A considered everyday polo. A clean collar, subtle placket, and a fit that never tries too hard.' : 'The tee you reach for without thinking. A clean neckline, considered proportions, and an effortless everyday fit.'} Cut from heavyweight combed cotton. No loud logos. Just a really good essential. Made to order in Jaipur, for wherever life takes you.`,
    fabric_details: '240 GSM cotton tee blank',
    images: category === 'polo' ? [photo] : [photo, back],
    colors: [color, ...palettes.filter(c => c !== color)],
    is_active: true, created_at: '2026-01-01T00:00:00.000Z',
  };
}));
export const SEED_INVENTORY: InventoryBlank[] = Object.values(COLORS).flatMap((color, i) => SIZES.map((size, j) => ({
  id: `10000000-0000-4000-8000-${String(i * 5 + j + 1).padStart(12, '0')}`,
  color_name: color, size, is_in_stock: !(color === 'Beige' && size === 'XXL'), stock_count: color === 'Beige' && size === 'XXL' ? 0 : 50,
})));
export const SEED_SETTINGS: StoreSettings = {
  whatsapp_number: '919000000000',
  banner_images: ['/images/hero-editorial.jpg', '/images/tee-bone.jpg', '/images/tee-sand.jpg'],
  pickup_discount: 60,instagram_url:'',whatsapp_catalog_url:'',reply_hours:'We reply during available hours. Your request is not an instant order confirmation.',dispatch_note:'Printing feasibility and dispatch timing are confirmed on WhatsApp before payment.',
};
