import { NextResponse } from 'next/server';
import { productSchema } from '@/lib/validation';
import { saveProduct } from '@/lib/server/store';
import { requireAdmin } from '@/lib/server/auth';
import { apiError, jsonBody, sameOrigin } from '@/lib/server/http';
export async function POST(request: Request) { try { sameOrigin(request,true); await requireAdmin(); const product=await saveProduct(productSchema.parse(await jsonBody(request))); return NextResponse.json({ success:true,product }); } catch(error) { return apiError(error); } }
