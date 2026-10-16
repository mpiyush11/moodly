'use client';
import { useEffect,useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/components/store/store-provider';
export function AnnouncementBar() {
  const [active,setActive]=useState(0); const {store}=useStore();
  useEffect(()=>{const timer=setInterval(()=>setActive(index=>(index+1)%2),4000);return ()=>clearInterval(timer);},[]);
  const messages=['240 GSM tees · Request on WhatsApp',`Jaipur pickup · Indicative saving ₹${store.settings.pickup_discount}`];
  return <div className="flex h-8 items-center justify-center bg-ink px-4 text-[9px] font-semibold tracking-[.08em] text-white sm:text-[10px]">
    <Link href="/shipping" className="inline-flex items-center gap-3"><span className="hidden text-white/55 sm:inline">GOOD BASICS. BETTER DAYS.</span><span className="hidden h-2.5 border-l border-white/25 sm:inline"/><span key={active} className="animate-fade">{messages[active]}</span><ArrowUpRight size={12}/></Link>
  </div>;
}
