import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/server/auth';
import { serviceSupabase,sessionSupabase } from '@/lib/supabase/server';
import { apiError,sameOrigin,rateLimit,requestBytes } from '@/lib/server/http';
import { CommerceError } from '@/lib/commerce';
export const runtime='nodejs';
export async function POST(request: Request) {
  try {
    sameOrigin(request,true); await requireAdmin(); rateLimit(request,'upload',20);
    const contentType=request.headers.get('content-type')??'';
    if (!/^multipart\/form-data;.*boundary=/i.test(contentType)) throw new CommerceError('Use a multipart image upload.',415);
    const raw=await requestBytes(request,6*1024*1024);
    let form:FormData;
    try { form=await new Response(new Uint8Array(raw),{headers:{'Content-Type':contentType}}).formData(); } catch { throw new CommerceError('Invalid multipart image upload. Please retry.',400); }
    const file=form.get('file');
    if (!file || typeof file==='string' || file.size===0 || file.size>5*1024*1024) throw new CommerceError('Choose a JPG, PNG, or WebP image under 5 MB.');
    const bytes=Buffer.from(await file.arrayBuffer());
    const jpeg=bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
    const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp=bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP';
    const ext=jpeg?'jpg':png?'png':webp?'webp':null;
    if (!ext) throw new CommerceError('Only genuine JPG, PNG, and WebP files are accepted.');
    const stem=file.name.normalize('NFKD').replace(/\.[^.]*$/,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'').toLowerCase()||'product-image';
    const filename=`${Date.now()}-${randomUUID()}-${stem}.${ext}`;
    const hasServerKey=Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
    const db=hasServerKey?serviceSupabase():await sessionSupabase();
    if (!hasServerKey) {
      // A development/demo Studio cookie is not a Supabase Storage identity.
      // Require a real Supabase session rather than falling back to anon writes.
      const {data,error}=await db.auth.getUser();
      if (error||!data.user) throw new CommerceError('Cloud uploads require a server-side SUPABASE_SERVICE_ROLE_KEY or an authorised Supabase Auth admin session.',503,'STORAGE_NOT_CONFIGURED');
    }
    const bucket=db.storage.from('product-images');
    const result=await bucket.upload(filename,bytes,{ contentType:jpeg?'image/jpeg':png?'image/png':'image/webp',upsert:false,cacheControl:'31536000' });
    if (result.error) throw new CommerceError('Image upload failed. Check the product-images storage bucket.',503);
    return NextResponse.json({ success:true,url:bucket.getPublicUrl(filename).data.publicUrl });
  } catch(error) { return apiError(error); }
}
