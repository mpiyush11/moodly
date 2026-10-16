import { NextResponse } from 'next/server';
import { statusSchema } from '@/lib/validation';
import { updateOrderStatus } from '@/lib/server/store';
import { requireAdmin } from '@/lib/server/auth';
import { apiError, jsonBody, sameOrigin } from '@/lib/server/http';
export async function PATCH(request: Request) { try { sameOrigin(request,true); await requireAdmin(); const { orderId,status }=statusSchema.parse(await jsonBody(request)); const order=await updateOrderStatus(orderId,status); return NextResponse.json({ success:true,order }); } catch(error) { return apiError(error); } }
