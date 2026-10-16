import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual, createHash } from 'node:crypto';
import { isDemo, sessionSupabase } from '@/lib/supabase/server';
import { CommerceError } from '@/lib/commerce';
import { headers } from 'next/headers';
import { isDevelopmentAdmin } from './development';
const demoKey = () => {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new CommerceError('Demo authentication requires a 32-character session secret.', 503);
  return new TextEncoder().encode(secret);
};
const cookieName = 'moodly-studio-demo';
const developmentCookie='moodly-studio-development';
const developmentKey=()=>createHash('sha256').update(process.env.ADMIN_SECRET_KEY??'').digest();
const secure = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');
export async function adminIdentity() {
  if(isDevelopmentAdmin()){
    const token=(await cookies()).get(developmentCookie)?.value;if(!token)return null;
    try{const {payload}=await jwtVerify(token,developmentKey(),{issuer:'moodly-development',audience:'moodly-studio-development'});return payload.sub==='development-studio'?{email:'Development administrator',demo:false,development:true}:null;}catch{return null;}
  }
  if (isDemo()) {
    const token = (await cookies()).get(cookieName)?.value;
    if (!token) return null;
    try { const { payload } = await jwtVerify(token, demoKey(), { issuer: 'moodly-demo', audience: 'moodly-studio' }); return payload.sub === 'demo-studio' ? { email: process.env.DEMO_ADMIN_EMAIL ?? 'studio@moodly.local', demo: true } : null; } catch { return null; }
  }
  const db = await sessionSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data, error } = await db.from('moodly_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error || !data) return null;
  return { email: user.email ?? 'Studio admin', demo: false };
}
export async function requireAdmin() { const identity = await adminIdentity(); if (!identity) throw new CommerceError('Please sign in with an authorised Studio account.', 401, 'UNAUTHORISED'); return identity; }
export async function signIn(email: string, password: string) {
  if(isDevelopmentAdmin()){
    const digest=(value:string)=>createHash('sha256').update(value).digest();
    if(!timingSafeEqual(digest(password),digest(process.env.ADMIN_PASSWORD!)))throw new CommerceError('Invalid admin password.',401);
    const token=await new SignJWT({role:'development-studio'}).setProtectedHeader({alg:'HS256'}).setSubject('development-studio').setIssuer('moodly-development').setAudience('moodly-studio-development').setIssuedAt().setExpirationTime('8h').sign(developmentKey());
    const requestHeaders=await headers();
    const secureCookie=requestHeaders.get('x-forwarded-proto')?.split(',')[0].trim()==='https'||process.env.CODESPACES==='true';
    (await cookies()).set(developmentCookie,token,{httpOnly:true,secure:secureCookie,sameSite:'lax',path:'/',maxAge:8*60*60});return;
  }
  if (isDemo()) {
    const configuredEmail = process.env.DEMO_ADMIN_EMAIL;
    const configuredPassword = process.env.DEMO_ADMIN_PASSWORD;
    if (!configuredEmail || !configuredPassword) throw new CommerceError('Demo credentials are not configured.', 503);
    const hash = (value: string) => createHash('sha256').update(value).digest();
    const validEmail = timingSafeEqual(hash(email.toLowerCase()), hash(configuredEmail.toLowerCase()));
    const validPassword = timingSafeEqual(hash(password), hash(configuredPassword));
    if (!validEmail || !validPassword) throw new CommerceError('Invalid email or password.', 401);
    const token = await new SignJWT({ role: 'demo-studio' }).setProtectedHeader({ alg: 'HS256' }).setSubject('demo-studio').setIssuer('moodly-demo').setAudience('moodly-studio').setIssuedAt().setExpirationTime('8h').sign(demoKey());
    (await cookies()).set(cookieName, token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 });
    return;
  }
  const db = await sessionSupabase();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw new CommerceError('Invalid email or password.', 401);
  if (!(await adminIdentity())) { await db.auth.signOut(); throw new CommerceError('This account does not have Studio access.', 403); }
}
export async function signOut() {
  if(isDevelopmentAdmin()){(await cookies()).delete(developmentCookie);return;}
  if (isDemo()) (await cookies()).delete(cookieName);
  else await (await sessionSupabase()).auth.signOut();
}
