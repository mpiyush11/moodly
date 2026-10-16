import { NextResponse } from 'next/server';
import { quoteSchema } from '@/lib/validation';
import { validateOrigin } from '@/lib/origin';
import { getQuote } from '@/lib/server/store';
import { apiError, jsonBody, rateLimit, sameOrigin } from '@/lib/server/http';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try { if (!validateOrigin(request)) sameOrigin(request, true); rateLimit(request, 'quote', 120); const { items,deliveryMode } = quoteSchema.parse(await jsonBody(request)); return NextResponse.json({ success: true, quote: await getQuote(items,deliveryMode) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiError(error); }
}
