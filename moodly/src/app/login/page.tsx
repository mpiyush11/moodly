import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { adminIdentity } from '@/lib/server/auth';
import { isDemo } from '@/lib/supabase/server';
import { isDevelopmentAdmin } from '@/lib/server/development';
import { StudioLogin } from '@/components/admin/studio-login';
export const metadata:Metadata={title:'Studio access',robots:{index:false,follow:false}};
export default async function LoginPage(){if(await adminIdentity())redirect('/admin/dashboard');return <StudioLogin development={isDevelopmentAdmin()} demo={isDemo()} demoEmail={isDemo()?process.env.DEMO_ADMIN_EMAIL:undefined} demoPassword={isDemo()?process.env.DEMO_ADMIN_PASSWORD:undefined}/>;}
