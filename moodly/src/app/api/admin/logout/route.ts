import { NextResponse } from 'next/server';
import { signOut } from '@/lib/server/auth';
import { apiError, sameOrigin } from '@/lib/server/http';
export async function POST(request: Request) { try { sameOrigin(request,true); await signOut(); return NextResponse.json({ success:true }); } catch(error) { return apiError(error); } }
