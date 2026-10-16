'use client';
import Link from 'next/link';
import { ArrowUpRight,Instagram } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
export function Footer({year}:{year:number}) {
  const {store}=useStore();
  const customUrl=`https://wa.me/${store.settings.whatsapp_number}?text=${encodeURIComponent('Hi Moodly! I have a question about your essentials.')}`;
  return <footer className="border-t border-neutral-200 bg-[#F8F8F6]">
    <div className="container-wide grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-[2fr_1fr_1fr_1.2fr] md:py-16">
      <div className="col-span-2 md:col-span-1"><Link href="/" className="text-[42px] font-extrabold tracking-[-.07em]">MOODLY<span className="ml-1 align-top text-xs">®</span></Link><p className="mt-3 text-sm text-neutral-500">Good basics. No noise.<br/>Made in Jaipur. Worn everywhere.</p></div>
      <div><h2 className="eyebrow mb-5">The essentials</h2><div className="flex flex-col gap-3 text-xs text-neutral-500"><Link href="/shop?category=down-shoulder">Down shoulder</Link><Link href="/shop?category=everyday">Everyday tees</Link><Link href="/shop?category=classic">Classic t-shirts</Link><Link href="/shop?category=polo">Polo t-shirts</Link></div></div>
      <div><h2 className="eyebrow mb-5">Good to know</h2><div className="flex flex-col gap-3 text-xs text-neutral-500"><Link href="/about">The Moodly way</Link><Link href="/shipping">Shipping & pickup</Link><Link href="/exchanges">Size exchanges</Link><Link href="/care">Care guide</Link></div></div>
      <div className="col-span-2 md:col-span-1"><h2 className="eyebrow mb-5">Real people. Real answers.</h2><p className="mb-4 text-xs leading-relaxed text-neutral-500">Need a hand finding your fit?<br/>We’re a message away.</p>{store.settings.whatsapp_number?<a href={customUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-6 border-b border-ink pb-2 text-xs font-semibold">Let’s talk on WhatsApp<ArrowUpRight size={16}/></a>:<Link href="/shipping" className="text-xs underline">Contact & delivery information</Link>}{store.settings.whatsapp_catalog_url&&<a href={store.settings.whatsapp_catalog_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold">WhatsApp Business catalogue<ArrowUpRight size={14}/></a>}{store.settings.instagram_url&&<a href={store.settings.instagram_url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 text-xs"><Instagram size={14}/>See our actual work on Instagram<ArrowUpRight size={13}/></a>}<p className="mt-4 text-xs leading-relaxed text-neutral-500">{store.settings.reply_hours}</p></div>
    </div>
    <div className="container-wide flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 py-5 text-[9px] text-neutral-500"><p>© {year} MOODLY. LESS, BUT BETTER.</p><div className="flex flex-wrap items-center gap-x-6 gap-y-3">{(store.demo||store.development)&&<span>{store.development?'Shared test database · no payments':'Preview mode · no live payments'}</span>}<Link href="/privacy">Privacy</Link><Link href="/login" className="text-neutral-400 hover:text-ink">Studio Access<ArrowUpRight size={10} className="ml-1 inline"/></Link></div></div>
  </footer>;
}
