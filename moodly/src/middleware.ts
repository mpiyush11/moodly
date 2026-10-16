import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV==='development'&&process.env.DATABASE_URL&&process.env.ADMIN_PASSWORD&&process.env.ADMIN_SECRET_KEY)return NextResponse.next();
  if (process.env.MOODLY_DEMO_MODE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return NextResponse.next();
  let response = NextResponse.next({ request });
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: list => { list.forEach(({ name,value }) => request.cookies.set(name,value)); response = NextResponse.next({ request }); list.forEach(({ name,value,options }) => response.cookies.set(name,value,options)); },
    },
  });
  await db.auth.getUser();
  return response;
}
export const config = { matcher: ['/admin/:path*', '/login'], runtime: 'nodejs' };
