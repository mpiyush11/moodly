'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BagItem, CheckoutItem, Product, StorefrontData } from '@/lib/types';
import { SIZES, COLORS } from '@/lib/types';
import { browserSupabase } from '@/lib/supabase/client';
interface StoreContextValue {
  store: StorefrontData; bag: BagItem[]; drawerOpen: boolean; instantItem: BagItem | null;
  addToBag: (product: Product, variant: Omit<CheckoutItem, 'productId'>) => void;
  buyNow: (product: Product, variant: Omit<CheckoutItem, 'productId'>) => void;
  openBag: () => void; closeBag: () => void;
  setQty: (index: number, qty: number) => void; removeItem: (index: number) => void; clearBag: () => void;
  refreshStore: () => Promise<void>;
}
const Context = createContext<StoreContextValue | null>(null);
export function StoreProvider({ initial, children }: { initial: StorefrontData; children: ReactNode }) {
  const [store, setStore] = useState(initial);
  const [bag, setBag] = useState<BagItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [instantItem, setInstantItem] = useState<BagItem | null>(null);
  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem('moodly-bag-v1') ?? '[]');
      if (Array.isArray(parsed)) setBag(parsed.slice(0,20).flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const product = initial.products.find(p => p.id === item.productId);
        if (!product || !SIZES.includes(item.size) || !(item.color in COLORS) || !product.colors.includes(item.color) || !Number.isInteger(item.qty)) return [];
        return [{ product,productId:product.id,size:item.size,color:item.color,qty:Math.max(1,Math.min(10,item.qty)) }];
      }));
    } catch { localStorage.removeItem('moodly-bag-v1'); }
    setHydrated(true);
  }, [initial.products]);
  useEffect(() => { if (hydrated) { try { localStorage.setItem('moodly-bag-v1', JSON.stringify(bag.map(({ product: _product,...item }) => item))); } catch { /* Private browsing may disable persistence; the bag still works in memory. */ } } }, [bag, hydrated]);
  const refreshStore = useCallback(async () => {
    try { const response = await fetch('/api/store',{cache:'no-store'}); if (response.ok) setStore(await response.json() as StorefrontData); } catch { /* Keep the last known catalog; checkout independently verifies live data. */ }
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) void refreshStore(); }, initial.demo ? 5000 : 30000);
    const client = initial.demo ? null : browserSupabase();
    const channel = client?.channel('moodly-storefront').on('postgres_changes',{ event:'*', schema:'public', table:'inventory_blanks' },refreshStore).on('postgres_changes',{ event:'*', schema:'public', table:'products' },refreshStore).on('postgres_changes',{ event:'*', schema:'public', table:'store_settings' },refreshStore).subscribe();
    return () => { clearInterval(timer); if (client && channel) void client.removeChannel(channel); };
  }, [refreshStore,initial.demo]);
  const addToBag = useCallback((product: Product, variant: Omit<CheckoutItem,'productId'>) => {
    setInstantItem(null);
    setBag(current => {
      const exists = current.findIndex(item => item.productId===product.id && item.size===variant.size && item.color===variant.color);
      if (exists>=0) return current.map((item,index)=>index===exists ? { ...item,qty:Math.min(10,item.qty+variant.qty),product } : item);
      if (current.length>=20) return current;
      return [...current,{...variant,productId:product.id,product}];
    });
    setDrawerOpen(true);
  }, []);
  const value = useMemo<StoreContextValue>(() => ({
    store, bag, drawerOpen, instantItem, addToBag,
    buyNow: (product,variant) => { setInstantItem({...variant,productId:product.id,product}); setDrawerOpen(true); },
    openBag: () => { setInstantItem(null); setDrawerOpen(true); }, closeBag: () => setDrawerOpen(false),
    setQty: (index,qty) => { if (instantItem) setInstantItem({...instantItem,qty:Math.max(1,Math.min(10,qty))}); else setBag(current=>current.map((item,i)=>i===index?{...item,qty:Math.max(1,Math.min(10,qty))}:item)); },
    removeItem: index => { if (instantItem) setInstantItem(null); else setBag(current=>current.filter((_,i)=>i!==index)); },
    clearBag: () => { if (instantItem) setInstantItem(null); else setBag([]); }, refreshStore,
  }),[store,bag,drawerOpen,instantItem,addToBag,refreshStore]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore() { const context=useContext(Context); if (!context) throw new Error('StoreProvider is required.'); return context; }
