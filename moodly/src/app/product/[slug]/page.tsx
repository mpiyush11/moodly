import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStorefront } from '@/lib/server/store';
import { ProductDetails } from '@/components/store/product-details';
import { ProductRail } from '@/components/store/product-rail';
import type { ColorHex } from '@/lib/types';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const {slug}=await params;const {products}=await getStorefront();const product=products.find(p=>p.slug===slug);
  return {title:product?.title??'Essential not found',description:product?.description??undefined};
}
export default async function ProductPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{color?:string}>}) {
  const [{slug},query,store]=await Promise.all([params,searchParams,getStorefront()]);const product=store.products.find(p=>p.slug===slug);if(!product)notFound();
  const color=product.colors.includes(query.color as ColorHex)?query.color as ColorHex:product.colors[0];
  return <><ProductDetails product={product} initialColor={color}/><div className="border-t border-neutral-200 pb-8"><ProductRail category={product.category} excludeProductId={product.id}/></div></>;
}
