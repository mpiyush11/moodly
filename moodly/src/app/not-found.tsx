import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
export default function NotFound(){return <div className="container-wide py-24 text-center"><p className="eyebrow text-neutral-500">404 / A little off the mood</p><h1 className="my-6 text-5xl font-extrabold uppercase tracking-tight">Nothing here.<br/>Plenty out there.</h1><Link href="/shop" className="primary-button">Back to the essentials<ArrowUpRight size={16}/></Link></div>;}
