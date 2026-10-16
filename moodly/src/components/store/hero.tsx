'use client';
import { useState,useEffect,useRef,type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowUpRight,ArrowRight,ChevronLeft,ChevronRight } from 'lucide-react';
import { useStore } from './store-provider';
import { cn } from '@/lib/utils';
const slides=[
  {kicker:'THE EVERYDAY COLLECTION / 001',first:'LESS NOISE.',second:'MORE YOU.',text:'Better basics. Bigger moods.\nPremium cotton. Nothing extra.',href:'/shop',label:'The art of everyday',position:'60% 50%',mobilePosition:'65% 50%'},
  {kicker:'YOUR NEW DAILY UNIFORM / 002',first:'ON REPEAT.',second:'BY DESIGN.',text:'The tee you reach for without thinking.\nAn everyday essential, done better.',href:'/shop?category=everyday',label:'Quietly indispensable',position:'50% 25%',mobilePosition:'50% 20%'},
  {kicker:'A LITTLE ROOM TO BE YOU / 003',first:'EASY FIT.',second:'BIG MOOD.',text:'Room to move. Space to be yourself.\nMeet your new favourite oversized fit.',href:'/shop?category=down-shoulder',label:'Comfort, considered',position:'50% 25%',mobilePosition:'50% 20%'},
];
export function Hero() {
  const [active,setActive]=useState(0); const [paused,setPaused]=useState(false); const touch=useRef(0); const {store}=useStore();
  useEffect(()=>{if(paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setActive(i=>(i+1)%slides.length),4000);return ()=>clearInterval(timer);},[paused]);
  const slide=slides[active];
  return <section aria-roledescription="carousel" aria-label="Moodly collections" className="relative overflow-hidden bg-[#EAE8E2]" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)} onTouchStart={event=>{touch.current=event.changedTouches[0].clientX;setPaused(true);}} onTouchEnd={event=>{const delta=event.changedTouches[0].clientX-touch.current;if(Math.abs(delta)>40)setActive(i=>(i+(delta>0?-1:1)+3)%3);setPaused(false);}}>
    <div className="hero-layout mx-auto grid max-w-[1440px] md:min-h-[540px] md:grid-cols-[.94fr_1.06fr] lg:min-h-[600px]">
      <div className="hero-copy pointer-events-none relative z-10 flex flex-col justify-center px-6 py-10 sm:px-12 md:pointer-events-auto md:py-14 lg:px-[72px]">
        <div key={active} className="pointer-events-auto animate-fade-up"><p className="hero-kicker mb-7 flex items-center gap-2.5 text-[9px] font-semibold tracking-[.13em] max-md:mb-3"><span className="h-1.5 w-1.5 bg-white md:bg-ink"/>{slide.kicker}</p><h1 className="text-[clamp(46px,5.75vw,83px)] font-extrabold uppercase leading-[.96] tracking-[-.065em]">{slide.first}<br/>{slide.second}</h1><p className="hero-description mb-7 mt-6 whitespace-pre-line text-[13px] leading-[1.85] text-neutral-600 md:mb-8 md:mt-7"><span className="md:hidden">{slide.text.split('\n')[0]}</span><span className="hidden md:inline">{slide.text}</span></p><Link href={slide.href} className="inline-flex h-12 items-center gap-9 rounded-full bg-white px-7 text-[11px] font-semibold text-ink transition-colors hover:bg-neutral-100 md:bg-ink md:text-white md:hover:bg-neutral-700">Shop Now<ArrowUpRight size={17}/></Link></div>
        <div className="hero-progress pointer-events-auto mt-10 flex items-center gap-5 text-[10px] font-medium md:absolute md:bottom-8 md:left-12 lg:left-[72px]"><span className="tabular-nums">0{active+1}<span className="ml-2 text-white/65 md:text-neutral-400">/ 03</span></span><div className="flex gap-1.5">{slides.map((_,index)=><button key={index} onClick={()=>setActive(index)} aria-label={`Show collection ${index+1}`} aria-current={index===active} className="flex h-8 items-center px-1 focus-visible:outline-white md:focus-visible:outline-ink"><span className={cn('h-[2px] w-7 transition-colors',index===active?'bg-white md:bg-ink':'bg-white/35 md:bg-ink/20')}/></button>)}</div><span className="hidden border-l border-black/20 pl-5 text-[8px] uppercase tracking-[.12em] lg:block">Essentials, not excess.</span></div>
      </div>
      <div className="hero-media relative h-[370px] min-w-0 overflow-hidden sm:h-[450px] md:h-full md:min-h-[540px] lg:min-h-[600px]">
        {slides.map((item,index)=><img key={index} src={store.settings.banner_images[index]||'/images/hero-editorial.jpg'} alt={['Black oversized Moodly tee, in the afternoon sun','Bone cotton everyday tee, quietly essential','Sand cotton tee with a relaxed silhouette'][index]} fetchPriority={index===0?'high':'auto'} className={cn('hero-slide absolute inset-0 h-full w-full object-cover',index===active?'opacity-100':'opacity-0')} style={{objectPosition:item.position,'--hero-mobile-position':item.mobilePosition} as CSSProperties}/>)}
        <div className="absolute inset-x-0 bottom-0 hidden items-center justify-between bg-gradient-to-t from-black/25 to-transparent px-6 pb-6 pt-16 text-white md:flex md:px-8"><p className="text-[9px] uppercase tracking-[.2em]">{slide.label}</p><span className="flex items-center gap-4"><button onClick={()=>setActive(i=>(i+2)%3)} aria-label="Previous collection" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50"><ChevronLeft size={14}/></button><button onClick={()=>setActive(i=>(i+1)%3)} aria-label="Next collection" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50"><ChevronRight size={14}/></button></span></div>
        <Link href="/about" className="absolute right-5 top-5 z-20 flex items-center gap-2 bg-white/90 px-3 py-2 text-[8px] font-bold uppercase tracking-[.1em] md:z-auto">Made in Jaipur<ArrowRight size={11}/></Link>
      </div>
    </div>
  </section>;
}
