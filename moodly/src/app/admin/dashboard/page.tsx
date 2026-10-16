import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { adminIdentity } from '@/lib/server/auth';
import { getAdminData } from '@/lib/server/store';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
export const metadata:Metadata={title:'Moodly Studio',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function DashboardPage(){const identity=await adminIdentity();if(!identity)redirect('/login');return <AdminDashboard initial={await getAdminData()} email={identity.email}/>;}
