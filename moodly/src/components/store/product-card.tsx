'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Product, ColorHex } from '@/lib/types';
import { COLORS } from '@/lib/types';
import { CATEGORY_INFO, variantImage } from '@/lib/catalog';
import { cn,money } from '@/lib/utils';
export function ProductCard({ product, index=0, rail=false }: { product:Product;index?:number;rail?:boolean }) {
  const [color,setColor]=useState<ColorHex>(product.colors[0]);
  return <article className={cn('product-card group min-w-0',rail&&'w-[72vw] max-w-[280px] shrink-0 snap-start md:w-auto md:shrink md:max-w-none md:basis-[270px] md:min-w-[270px]')}>
    <Link href={`/product/${product.slug}?color=${encodeURIComponent(color)}`} className="relative block aspect-[3/4] overflow-hidden bg-[#F1F0EC]">
      <img src={variantImage(product,color)} alt={`${product.title} in ${COLORS[color]}`} loading="lazy" className="product-image h-full w-full object-cover object-top"/>
      {index===0&&<span className="absolute left-3 top-3 bg-white px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-widest">Catalogue pick</span>}
      <span className="absolute inset-x-3 bottom-3 flex translate-y-14 items-center justify-between bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">Find your fit<ArrowUpRight size={15}/></span>
    </Link>
    <div className="flex w-full min-w-0 flex-col gap-1 pt-2 md:gap-0 md:pt-3.5">
      <div className="product-meta flex w-full min-w-0 !flex-nowrap !items-center justify-between gap-2">
        <p title={CATEGORY_INFO[product.category].fit} className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] uppercase tracking-wider text-neutral-500 md:text-[9px] md:tracking-[.1em]">{CATEGORY_INFO[product.category].fit}</p>
        <div className="flex shrink-0 gap-1 md:gap-1.5" aria-label="Available colours">
          {product.colors.map(hex=><button key={hex} type="button" aria-label={`Preview ${COLORS[hex]}`} aria-pressed={color===hex}
            onPointerDown={event=>event.stopPropagation()} onTouchStart={event=>event.stopPropagation()}
            onClick={event=>{event.preventDefault();event.stopPropagation();setColor(hex);}}
            className={cn('swatch-button flex h-7 w-7 shrink-0 touch-none items-center justify-center rounded-full border p-1.5 md:h-4 md:w-4 md:p-0',color===hex?'border-ink':'border-transparent')}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{background:hex}}/>
          </button>)}
        </div>
      </div>
      <Link href={`/product/${product.slug}`} title={product.title} className="block w-full min-w-0 truncate py-px text-sm font-medium leading-tight tracking-tight md:mt-1.5 md:overflow-visible md:whitespace-normal md:py-0 md:font-bold md:leading-5">{product.title}</Link>
      <div className="flex shrink-0 items-baseline gap-2 whitespace-nowrap text-[12px] md:mt-1.5 md:items-center md:gap-2.5">
        <span className="shrink-0 font-semibold">{money(product.base_price)}</span><span className="shrink-0 text-[10px] text-neutral-400 line-through">{money(product.mrp)}</span>
      </div>
    </div>
  </article>;
}
