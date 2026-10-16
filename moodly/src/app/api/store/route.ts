import { NextResponse } from 'next/server';
import { getStorefront } from '@/lib/server/store';
import { apiError } from '@/lib/server/http';
export const dynamic = 'force-dynamic';
export async function GET() { try { return NextResponse.json(await getStorefront(), { headers: { 'Cache-Control': 'no-store' } }); } catch (error) { return apiError(error); } }
