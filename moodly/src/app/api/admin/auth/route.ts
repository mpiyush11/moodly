import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { signIn } from '@/lib/server/auth';
import { apiError, jsonBody, rateLimit, sameOrigin } from '@/lib/server/http';
export async function POST(request: Request) {
  try { sameOrigin(request,true); rateLimit(request,'login',10,15*60*1000); const { email,password } = loginSchema.parse(await jsonBody(request)); await signIn(email,password); return NextResponse.json({ success:true }); } catch(error) { return apiError(error); }
}
