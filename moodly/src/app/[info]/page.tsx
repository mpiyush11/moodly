import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { INFORMATION } from '@/lib/information';
export async function generateMetadata({params}:{params:Promise<{info:string}>}):Promise<Metadata>{const {info}=await params;return {title:INFORMATION[info]?.kicker??'Page not found'};}
export default async function InformationPage({params}:{params:Promise<{info:string}>}) {
  const {info}=await params;const data=INFORMATION[info];if(!data)notFound();
  return <div className="container-wide py-12 md:py-20"><div className="mx-auto max-w-3xl"><p className="eyebrow mb-5 text-neutral-500">{data.kicker}</p><h1 className="text-[42px] font-extrabold uppercase leading-[1.04] tracking-[-.055em] md:text-[70px]">{data.title}</h1><p className="mb-12 mt-6 max-w-xl text-sm leading-[1.9] text-neutral-500">{data.intro}</p><div className="space-y-8">{data.sections.map((section,index)=><section key={section.heading} className="grid gap-3 border-t border-neutral-200 pt-7 sm:grid-cols-[.5fr_2fr]"><span className="eyebrow text-neutral-400">0{index+1}</span><div><h2 className="mb-3 text-lg font-extrabold uppercase tracking-tight">{section.heading}</h2><p className="text-sm leading-[1.9] text-neutral-500">{section.text}</p></div></section>)}</div><Link href="/shop" className="primary-button mt-12 rounded-full">Explore the essentials<ArrowUpRight size={16}/></Link></div></div>;
}
