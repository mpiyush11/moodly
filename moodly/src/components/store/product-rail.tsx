'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft,ArrowRight,ArrowUpRight } from 'lucide-react';
import { useStore } from './store-provider';
import { cn } from '@/lib/utils';
import { ProductCard } from './product-card';
import { CATEGORY_INFO } from '@/lib/catalog';
import type { Category } from '@/lib/types';
export function ProductRail({category,excludeProductId}:{category:Category;excludeProductId?:string}) {
  const {store}=useStore();
  const products=store.products.filter(product=>product.category===category&&product.id!==excludeProductId);
  const rail=useRef<HTMLDivElement>(null); const info=CATEGORY_INFO[category];
  const [edges,setEdges]=useState({left:false,right:false});
  const [pagination,setPagination]=useState({active:0,positions:[0]});
  const measure=useCallback(()=>{
    const element=rail.current;if(!element)return;
    const maximum=Math.max(0,element.scrollWidth-element.clientWidth);
    const left=element.scrollLeft>2,right=element.scrollLeft<maximum-2;
    setEdges(previous=>previous.left===left&&previous.right===right?previous:{left,right});
    const children=(Array.from(element.children) as HTMLElement[]).filter(child=>child.getClientRects().length>0);
    const first=children[0]?.offsetLeft??0;
    const positions=children.length?children.map(child=>Math.min(maximum,Math.max(0,child.offsetLeft-first))).filter((position,index,all)=>index===0||position-all[index-1]>1):[0];
    let active=0;for(let index=1;index<positions.length;index++)if(Math.abs(positions[index]-element.scrollLeft)<Math.abs(positions[active]-element.scrollLeft))active=index;
    setPagination(previous=>previous.active===active&&previous.positions.length===positions.length&&previous.positions.every((position,index)=>Math.abs(position-positions[index])<1)?previous:{active,positions});
  },[]);
  useEffect(()=>{measure();const observer=new ResizeObserver(measure);if(rail.current)observer.observe(rail.current);return ()=>observer.disconnect();},[measure,products.length]);
  function scroll(direction:1|-1){
    if(window.matchMedia('(min-width: 768px)').matches){rail.current?.scrollBy({left:direction*560,behavior:'smooth'});return;}
    const page=Math.max(0,Math.min(pagination.positions.length-1,pagination.active+direction));
    rail.current?.scrollTo({left:pagination.positions[page],behavior:'smooth'});
  }
  return <section className="product-rail py-9 md:py-12">
    <div className="container-wide mb-6 flex items-end justify-between gap-3"><div className="min-w-0"><p className="eyebrow mb-2 text-neutral-500">{info.label}</p><h2 className="text-[27px] font-extrabold uppercase leading-none tracking-[-.045em] md:text-[36px]">{info.title}</h2></div><div className="flex shrink-0 items-center gap-5"><Link href={`/shop?category=${category}`} className="flex items-center gap-2 pt-7 text-[11px] font-semibold md:pt-0"><span className="md:hidden">View all</span><span className="hidden md:inline">View collection</span><ArrowUpRight size={15}/></Link><div className="hidden gap-2 md:flex"><button disabled={!edges.left} className={cn("flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 hover:border-ink disabled:opacity-25")} onClick={()=>scroll(-1)} aria-label={`Scroll ${info.title} left`}><ArrowLeft size={15}/></button><button disabled={!edges.right} className={cn("flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 hover:border-ink disabled:opacity-25")} onClick={()=>scroll(1)} aria-label={`Scroll ${info.title} right`}><ArrowRight size={15}/></button></div></div></div>
    <div className="container-wide">
      <div ref={rail} onScroll={measure} className="no-scrollbar scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:gap-6 md:pb-1">
        {products.map((product,index)=><ProductCard key={product.id} product={product} index={index} rail/>)}
        <Link href={`/shop?category=${category}`} className="hidden w-[72vw] max-w-[280px] shrink-0 snap-start flex-col items-center justify-center self-start border border-neutral-200 bg-[#F8F8F6] text-center md:flex md:w-auto md:shrink md:max-w-none md:basis-[270px] md:min-w-[270px]" style={{aspectRatio:'3/4'}}><span className="eyebrow text-neutral-400">There’s more to your mood</span><span className="mt-4 text-[25px] font-extrabold uppercase tracking-tight">The whole<br/>collection.</span><span className="mt-6 flex h-12 w-12 items-center justify-center rounded-full border border-ink"><ArrowUpRight size={20}/></span><span className="mt-6 text-[10px] font-semibold uppercase tracking-widest">View all</span></Link>
      </div>
      {pagination.positions.length>1&&<div role="group" aria-label={`${info.title} collection pages`} className="relative z-10 mt-4 flex flex-wrap justify-center gap-2 md:hidden">
        {pagination.positions.map((position,index)=><button key={index} type="button" aria-label={`Show ${info.title} page ${index+1}`} aria-current={pagination.active===index?'true':undefined} onClick={()=>rail.current?.scrollTo({left:position,behavior:'smooth'})} className="flex h-6 w-6 items-center justify-center rounded-full">
          <span className={cn('h-1.5 w-1.5 rounded-full',pagination.active===index?'bg-ink':'bg-neutral-200')}/>
        </button>)}
      </div>}
    </div>
  </section>;
}
