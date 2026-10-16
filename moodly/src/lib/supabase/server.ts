import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CommerceError } from '@/lib/commerce';
export const isDemo = () => process.env.MOODLY_DEMO_MODE === 'true';
export const hasSupabase = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export function publicSupabase() {
  if (!hasSupabase()) throw new CommerceError('Supabase is not configured. Follow the setup guide or explicitly enable demo mode.', 503, 'STORE_NOT_CONFIGURED');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function serviceSupabase() {
  if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new CommerceError('Secure checkout is not configured. Please contact the studio.', 503, 'STORE_NOT_CONFIGURED');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function sessionSupabase() {
  if (!hasSupabase()) throw new CommerceError('Studio authentication is not configured.', 503, 'STORE_NOT_CONFIGURED');
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: list => {
        try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server components cannot write cookies; middleware owns token refresh. */ }
      },
    },
  });
}
