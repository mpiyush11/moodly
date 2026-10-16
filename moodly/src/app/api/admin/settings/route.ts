import { NextResponse } from 'next/server';
import { settingsSchema } from '@/lib/validation';
import { saveSettings } from '@/lib/server/store';
import { requireAdmin } from '@/lib/server/auth';
import { apiError, jsonBody, sameOrigin } from '@/lib/server/http';
export async function PATCH(request: Request) { try { sameOrigin(request,true); await requireAdmin(); const settings=await saveSettings(settingsSchema.parse(await jsonBody(request))); return NextResponse.json({ success:true,settings }); } catch(error) { return apiError(error); } }
