import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { useLocalImageStorage } from '@/lib/server/development';
export async function GET(_request: Request,{params}:{params:Promise<{filename:string}>}) {
  const {filename}=await params;
  if (!useLocalImageStorage() || !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename)) return new Response('Not found',{status:404});
  try { const bytes=await readFile(path.join(process.cwd(),'.data','uploads',filename)); return new Response(new Uint8Array(bytes),{ headers:{'Content-Type':filename.endsWith('.jpg')?'image/jpeg':filename.endsWith('.png')?'image/png':'image/webp','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'} }); } catch { return new Response('Not found',{status:404}); }
}
