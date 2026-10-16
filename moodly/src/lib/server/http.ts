import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { CommerceError } from '@/lib/commerce';
import { isTrustedRequestOrigin,normalizeOrigin } from '@/lib/origin';
const state = globalThis as typeof globalThis & { moodlyLimits?: Map<string, { hits: number; reset: number }> };
export function rateLimit(request: Request, bucket: string, limit = 30, windowMs = 60_000) {
  const map = state.moodlyLimits ??= new Map();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  if (map.size > 10000) for (const [k,v] of map) if (v.reset < now) map.delete(k);
  const row = map.get(key);
  if (row && row.reset > now) { if (row.hits >= limit) throw new CommerceError('Too many requests. Please try again shortly.', 429, 'RATE_LIMITED'); row.hits++; }
  else map.set(key, { hits: 1, reset: now + windowMs });
}
export function sameOrigin(request: Request, requireOrigin = false) {
  const origin = request.headers.get('origin');
  if (!origin) { if (requireOrigin) throw new CommerceError('A browser origin is required.', 403, 'FORBIDDEN'); return; }
  if (!normalizeOrigin(origin)) throw new CommerceError('Invalid request origin.',403,'FORBIDDEN');
  if (!isTrustedRequestOrigin(request)) throw new CommerceError('Cross-origin request rejected. Open Studio on the same website address and retry.',403,'FORBIDDEN');
}
export async function requestBytes(request: Request, maxSize = 32768) {
  if (Number(request.headers.get('content-length') ?? 0) > maxSize) throw new CommerceError('Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CommerceError('A request body is required.', 400);
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxSize) { await reader.cancel(); throw new CommerceError('Request is too large.', 413); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function jsonBody(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new CommerceError('Use an application/json request.', 415);
  const raw = (await requestBytes(request)).toString('utf8');
  try { return JSON.parse(raw) as unknown; } catch { throw new CommerceError('Invalid JSON request.', 400); }
}
export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ success: false, error: error.issues[0]?.message ?? 'Invalid request.', code: 'VALIDATION_ERROR' }, { status: 400 });
  if (error instanceof CommerceError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status, headers: error.status === 429 ? { 'Retry-After': '60' } : undefined });
  console.error('[Moodly API]', error);
  return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' }, { status: 500 });
}
