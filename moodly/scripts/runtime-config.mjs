import { readFileSync } from 'node:fs';
import path from 'node:path';
import { rootCertificates } from 'node:tls';
export const developmentDefaults = JSON.parse(readFileSync(path.join(process.cwd(),'config/development.defaults.json'),'utf8'));
export function usesDirectDatabase(env=process.env) { return Boolean(env.DATABASE_URL && !env.SUPABASE_SERVICE_ROLE_KEY); }
export function isSharedTestDatabase(env=process.env) {
  if(!env.DATABASE_URL)return false;
  try{const input=new URL(env.DATABASE_URL);const fixture=new URL(developmentDefaults.env.DATABASE_URL);return input.username===fixture.username&&input.password===fixture.password&&input.pathname===fixture.pathname&&[fixture.hostname,developmentDefaults.testPoolerHost].includes(input.hostname);}catch{return false;}
}
export function developmentAdminEnabled(env=process.env) {
  return env.NODE_ENV === 'development' && env.MOODLY_DEMO_MODE !== 'true' && Boolean(env.DATABASE_URL && env.ADMIN_PASSWORD && env.ADMIN_SECRET_KEY);
}
export function databaseOptions(env=process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  if (env.NODE_ENV === 'production' && isSharedTestDatabase(env)) throw new Error('Shared test database credentials are disabled in production. Use npm run dev for the shared test setup, or configure private production credentials.');
  const url=new URL(env.DATABASE_URL);
  if (!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
  if (isSharedTestDatabase(env)) url.hostname=developmentDefaults.testPoolerHost;
  const local=['localhost','127.0.0.1','::1'].includes(url.hostname);
  const ca=[...rootCertificates,readFileSync(path.join(process.cwd(),'supabase/certs/prod-ca-2021.crt'),'utf8')];
  if (env.DATABASE_CA_CERT) ca.push(env.DATABASE_CA_CERT.replaceAll('\\n','\n'));
  return {
    url:url.toString(),
    options:{
      ssl:local && url.searchParams.get('sslmode')!=='require' ? false : { rejectUnauthorized:true,ca },
      prepare:false,max:5,connect_timeout:12,idle_timeout:20,
      transform:{value:{from:value=>value instanceof Date ? value.toISOString() : value}},
    },
  };
}
