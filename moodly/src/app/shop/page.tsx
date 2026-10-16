import type { Metadata } from 'next';
import { Catalog } from '@/components/store/catalog';
export const metadata:Metadata={title:'The essentials'};
export default async function ShopPage({searchParams}:{searchParams:Promise<{category?:string;q?:string}>}) { const filters=await searchParams;return <Catalog category={filters.category} query={filters.q??''}/>; }
