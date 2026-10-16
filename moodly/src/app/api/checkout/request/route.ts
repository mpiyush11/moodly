import { NextResponse } from 'next/server';
import { requestSchema } from '@/lib/validation';
import { validateOrigin } from '@/lib/origin';
import { apiError,jsonBody,rateLimit,sameOrigin } from '@/lib/server/http';
import { getStorefront } from '@/lib/server/store';
import { verifiedQuote } from '@/lib/commerce';
import { whatsappRequestUrl } from '@/lib/request';
export const dynamic='force-dynamic';
export async function POST(request:Request){
  try{
    if(!validateOrigin(request))sameOrigin(request,true);rateLimit(request,'request',30);
    const payload=requestSchema.parse(await jsonBody(request));const store=await getStorefront();
    const quote=verifiedQuote(payload.items,payload.deliveryMode,store.products,store.inventory,store.settings);
    return NextResponse.json({success:true,whatsappUrl:whatsappRequestUrl(quote,store.settings.whatsapp_number,payload.city),quote,requestOnly:true,stockReserved:false,orderCreated:false,demo:store.demo,development:store.development??false});
  }catch(error){return apiError(error);}
}
