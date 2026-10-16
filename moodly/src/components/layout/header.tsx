'use client';
import Link from 'next/link';
import { usePathname,useRouter } from 'next/navigation';
import { useState,useRef,useEffect } from 'react';
import { Search,ShoppingBag,Menu,ArrowUpRight,ArrowRight,X } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { useStore } from '@/components/store/store-provider';
import { CATEGORY_INFO } from '@/lib/catalog';
import { money,cn } from '@/lib/utils';
const navigation=[['Shop all','/shop'],['Oversized','/shop?category=down-shoulder'],['Everyday','/shop?category=everyday'],['Classics','/shop?category=classic'],['Polos','/shop?category=polo']];
export function Header() {
  const {bag,openBag,store}=useStore(); const [searchOpen,setSearchOpen]=useState(false); const [menuOpen,setMenuOpen]=useState(false); const [query,setQuery]=useState(''); const input=useRef<HTMLInputElement>(null); const router=useRouter(); const path=usePathname();
  const count=bag.reduce((sum,item)=>sum+item.qty,0);
  const results=store.products.filter(p=>`${p.title} ${CATEGORY_INFO[p.category].title}`.toLowerCase().includes(query.toLowerCase())).slice(0,6);
  useEffect(()=>{if(searchOpen) input.current?.focus();},[searchOpen]);
  useEffect(()=>{setSearchOpen(false);setMenuOpen(false);},[path]);
  return <>
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-xl">
      <div className="container-wide flex h-[76px] items-center justify-between gap-4 max-md:h-[66px]">
        <div className="flex items-center gap-2"><button className="icon-button -ml-2 md:hidden" onClick={()=>setMenuOpen(true)} aria-label="Open navigation"><Menu size={21} strokeWidth={1.5}/></button><Link href="/" aria-label="Moodly home" className="relative text-[31px] font-extrabold leading-none tracking-[-.07em] max-md:text-[27px]">MOODLY<span className="ml-0.5 align-top text-[9px] tracking-normal">®</span></Link></div>
        <nav aria-label="Main navigation" className="hidden h-full items-center gap-7 md:flex lg:gap-9">{navigation.map(([label,href])=><Link key={href} href={href} className="group relative flex h-full items-center text-[11px] font-semibold transition-opacity hover:opacity-60">{label}<span className="absolute inset-x-0 bottom-5 h-px origin-left scale-x-0 bg-ink transition-transform group-hover:scale-x-100"/></Link>)}</nav>
        <div className="flex items-center gap-1 sm:gap-3"><button className="icon-button" onClick={()=>setSearchOpen(true)} aria-label="Search products"><Search size={21} strokeWidth={1.5}/></button><button className="relative flex h-10 items-center gap-2.5 px-1" onClick={openBag} aria-label={`Open selection, ${count} items`}><ShoppingBag size={21} strokeWidth={1.5}/><span className="hidden text-[11px] font-semibold lg:block">Selection</span><span className={cn('flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold',count?'bg-ink text-white':'bg-neutral-100')}>{count}</span></button></div>
      </div>
    </header>
    <Dialog open={searchOpen} onClose={()=>setSearchOpen(false)} title="Find your next essential">
      <div className="p-6"><form onSubmit={event=>{event.preventDefault();router.push(`/shop?q=${encodeURIComponent(query)}`);setSearchOpen(false);}} className="flex items-center border-b border-ink pb-3"><Search size={21} className="mr-3 shrink-0"/><input ref={input} value={query} onChange={event=>setQuery(event.target.value)} aria-label="Search by product or category" placeholder="Try ‘oversized’ or ‘polo’" className="min-w-0 flex-1 border-none bg-transparent py-2 text-base outline-none"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear search"><X size={18}/></button>}</form>
        {!query&&<div className="mt-5 flex flex-wrap gap-2">{['Oversized','Black','Everyday','Polo'].map(term=><button key={term} onClick={()=>setQuery(term)} className="border border-neutral-200 px-3 py-2 text-xs hover:border-ink">{term}<ArrowUpRight size={12} className="ml-2 inline"/></button>)}</div>}
        <p className="eyebrow mb-4 mt-7 text-neutral-500">{query?'Matching essentials':'A good place to start'}</p>
        {results.length? <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">{results.map(product=><Link href={`/product/${product.slug}`} key={product.id} onClick={()=>setSearchOpen(false)} className="group"><img src={product.images[0]} alt={product.title} className="mb-2 aspect-[3/4] w-full object-cover"/><p className="text-xs font-semibold">{product.title}</p><p className="mt-1 text-xs text-neutral-500">{money(product.base_price)}</p></Link>)}</div>:<p className="py-8 text-sm text-neutral-500">No essentials found. Try another colour or fit.</p>}
        <button onClick={()=>{router.push(`/shop?q=${encodeURIComponent(query)}`);setSearchOpen(false);}} className="mt-6 flex w-full items-center justify-between border-t border-neutral-200 pt-5 text-xs font-bold uppercase tracking-wider">View all results<ArrowRight size={17}/></button>
      </div>
    </Dialog>
    <Dialog open={menuOpen} onClose={()=>setMenuOpen(false)} title="Explore Moodly" drawer>
      <nav className="p-6">{navigation.map(([label,href])=><Link key={href} href={href} onClick={()=>setMenuOpen(false)} className="flex items-center justify-between border-b border-neutral-200 py-5 text-xl font-bold uppercase tracking-tight">{label}<ArrowUpRight size={20}/></Link>)}<Link href="/about" onClick={()=>setMenuOpen(false)} className="mt-8 block text-sm text-neutral-500">The Moodly way</Link></nav>
    </Dialog>
  </>;
}
