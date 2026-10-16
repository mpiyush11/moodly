import { access,writeFile } from 'node:fs/promises';
import { fileURLToPath,pathToFileURL } from 'node:url';
import path from 'node:path';
import { developmentDefaults } from './runtime-config.mjs';
export async function ensureEnvironment(root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),env=process.env) {
  const filename=path.join(root,'.env.local');
  try { await access(filename); return {created:false,productionSkipped:false}; } catch(error) {if(error.code!=='ENOENT')throw error;}
  if(env.NODE_ENV==='production')return {created:false,productionSkipped:true};
  const fields={...developmentDefaults.env};
  for(const key of [...Object.keys(fields),'SUPABASE_SERVICE_ROLE_KEY','DEMO_ADMIN_EMAIL','DEMO_ADMIN_PASSWORD','DEMO_SESSION_SECRET','DATABASE_CA_CERT','NEXT_PUBLIC_SITE_URL','MOODLY_TRUSTED_ORIGINS'])if(env[key]!==undefined)fields[key]=env[key];
  const text='# Automatically generated shared TEST configuration. Do not use with personal data or payments.\n'+Object.entries(fields).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n';
  try {await writeFile(filename,text,{mode:0o600,flag:'wx'});}catch(error){if(error.code==='EEXIST')return {created:false,productionSkipped:false};throw error;}
  return {created:true,productionSkipped:false};
}
async function main(){const result=await ensureEnvironment();console.log(result.created?'[Moodly] Created .env.local from shared test defaults. Existing configs are never overwritten.':result.productionSkipped?'[Moodly] Production install: shared environment defaults are not generated.':'[Moodly] Keeping existing .env.local.');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('[Moodly] Environment setup failed. Check workspace write permissions.');process.exit(1);});
