import { NextResponse } from 'next/server';
import { stockSchema } from '@/lib/validation';
import { updateStock } from '@/lib/server/store';
import { requireAdmin } from '@/lib/server/auth';
import { apiError, jsonBody, sameOrigin } from '@/lib/server/http';
export async function PATCH(request: Request) { try { sameOrigin(request,true); await requireAdmin(); const stock=await updateStock(stockSchema.parse(await jsonBody(request))); return NextResponse.json({ success:true,stock }); } catch(error) { return apiError(error); } }
