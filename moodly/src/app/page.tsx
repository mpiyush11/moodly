import Link from 'next/link';
import { ArrowUpRight,Feather,Truck,RefreshCw,Scissors } from 'lucide-react';
import { Hero } from '@/components/store/hero';
import { ProductRail } from '@/components/store/product-rail';
import { CATEGORY_INFO } from '@/lib/catalog';
import { CATEGORIES } from '@/lib/types';
import { RequestGuide } from '@/components/store/request-guide';
import { CustomPrint } from '@/components/store/custom-print';
export default function HomePage() {
  return <>
    <Hero/>
    <div className="border-b border-neutral-200"><div className="container-wide grid grid-cols-2 gap-y-5 py-6 md:grid-cols-4 md:py-7">{[{icon:Feather,label:'240 GSM tee blanks'},{icon:Scissors,label:'Confirm before printing'},{icon:Truck,label:'Delivery confirmed in chat'},{icon:RefreshCw,label:'Get help with your fit'}].map(({icon:Icon,label},index)=><div key={label} className={`flex items-center justify-center gap-2.5 ${index?'md:border-l md:border-neutral-200':''}`}><Icon size={17} strokeWidth={1.35}/><span className="text-[10px] font-semibold uppercase tracking-[.055em] md:text-[8px] lg:text-[9px]">{label}</span></div>)}</div></div>
    <section className="container-wide pb-7 pt-14 md:pb-10 md:pt-20">
      <div className="mb-7 flex items-end justify-between gap-6"><div><p className="eyebrow mb-3 text-neutral-500">Built around you</p><h2 className="text-[30px] font-extrabold uppercase leading-none tracking-[-.05em] md:text-[42px]">Find your fit.</h2><p className="mt-3 text-xs text-neutral-500">Four silhouettes. Endless ways to be you.</p></div><Link href="/shop" className="mb-1 flex items-center gap-2 whitespace-nowrap text-[10px] font-semibold sm:text-xs">Explore all<ArrowUpRight size={16}/></Link></div>
      <div className="grid grid-cols-2 gap-3 md:gap-5">{CATEGORIES.map((category,index)=>{const info=CATEGORY_INFO[category];return <Link href={`/shop?category=${category}`} key={category} className="group relative min-w-0 overflow-hidden bg-[#EBEAE6] max-md:border max-md:border-neutral-200">
        <div data-fit-image className="relative aspect-[4/5] overflow-hidden md:aspect-[1.65] lg:aspect-[1.9]"><img src={info.image} alt={info.title} loading="lazy" className="product-image h-full w-full object-cover object-[50%_10%]"/><div className="absolute inset-0 hidden bg-gradient-to-t from-black/55 via-transparent to-transparent md:block"/><span className="absolute left-4 top-4 hidden text-[8px] font-semibold uppercase tracking-[.1em] text-white/80 sm:left-6 sm:top-6 md:block">0{index+1} / The essentials</span><div className="absolute inset-x-4 bottom-4 hidden items-end justify-between gap-2 text-white sm:inset-x-6 sm:bottom-6 md:flex"><div><h3 className="text-[18px] font-extrabold uppercase leading-tight tracking-tight sm:text-[27px]">{info.title}</h3><p className="mt-1.5 hidden text-[10px] text-white/80 sm:block">{info.subtitle}</p></div><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/50 transition-colors group-hover:bg-white group-hover:text-ink sm:h-10 sm:w-10"><ArrowUpRight size={16}/></span></div></div>
        <div data-fit-caption className="flex min-h-16 min-w-0 items-center justify-between gap-2 bg-white p-3 text-ink md:hidden"><h3 className="min-w-0 flex-1 text-xs font-bold uppercase leading-4 tracking-[.04em]"><span className="block whitespace-nowrap">{info.title.split(' ')[0]}</span><span className="block whitespace-nowrap">{info.title.split(' ').slice(1).join(' ')}</span></h3><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200"><ArrowUpRight size={16} aria-hidden="true"/></span></div>
      </Link>})}</div>
    </section>
    <div className="pt-2 md:pt-5">{CATEGORIES.map(category=><ProductRail category={category} key={category}/>)}</div>
    <CustomPrint/>
    <RequestGuide/>
    <section className="container-wide py-16 text-center md:py-24"><p className="eyebrow mb-5 text-neutral-500">The Moodly way</p><h2 className="text-[35px] font-extrabold uppercase leading-[1.05] tracking-[-.05em] md:text-[60px]">Not more clothes.<br/>More you.</h2><p className="mx-auto mb-6 mt-5 max-w-[380px] text-xs leading-[1.9] text-neutral-500">We believe a great wardrobe starts with fewer, better things.<br className="hidden sm:block"/>Thoughtfully made. Effortlessly worn. Unapologetically you.</p><Link href="/about" className="inline-flex items-center gap-4 border-b border-ink pb-2 text-[11px] font-semibold">Meet Moodly<ArrowUpRight size={16}/></Link></section>
  </>;
}
