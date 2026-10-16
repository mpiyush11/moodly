import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { getAdminData } from '@/lib/server/store';
import { apiError } from '@/lib/server/http';
export const dynamic = 'force-dynamic';
export async function GET() { try { await requireAdmin(); return NextResponse.json(await getAdminData(), { headers:{ 'Cache-Control':'no-store' } }); } catch(error) { return apiError(error); } }
