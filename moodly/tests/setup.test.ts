import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,rm,mkdir,chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { developmentAdminEnabled,databaseOptions,developmentDefaults } from '../scripts/runtime-config.mjs';
import { ensureEnvironment } from '../scripts/setup-env.mjs';
test('development password authentication is never enabled in production',()=>{
  const env={...developmentDefaults.env,NODE_ENV:'production'};
  assert.equal(developmentAdminEnabled(env),false);
  assert.throws(()=>databaseOptions(env),/disabled in production/);
  const corrected=new URL(env.DATABASE_URL);corrected.hostname=developmentDefaults.testPoolerHost;assert.throws(()=>databaseOptions({...env,DATABASE_URL:corrected.toString()}),/disabled in production/);
  assert.equal(developmentAdminEnabled({...env,NODE_ENV:'development'}),true);
  assert.equal(developmentAdminEnabled({...env,NODE_ENV:'development',MOODLY_DEMO_MODE:'true'}),false);
});
test('verified pooler correction preserves the supplied value and never changes custom database endpoints',()=>{
  const env={...developmentDefaults.env,NODE_ENV:'development'};
  const config=databaseOptions(env);assert.equal(new URL(config.url).hostname,'aws-0-ap-southeast-2.pooler.supabase.com');assert.equal(config.options.prepare,false);assert.equal(typeof config.options.ssl==='object'&&config.options.ssl.rejectUnauthorized,true);
  const custom=databaseOptions({...env,DATABASE_URL:'postgresql://tester:test@localhost:5432/moodly'});
  assert.equal(new URL(custom.url).hostname,'localhost');assert.equal(custom.options.ssl,false);
});
test('fresh clones generate a complete environment without truncating hash-containing passwords',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'moodly-env-'));
  try{const result=await ensureEnvironment(root,{NODE_ENV:'development'});assert.equal(result.created,true);const content=await readFile(path.join(root,'.env.local'),'utf8');assert.ok(content.includes(`ADMIN_PASSWORD=${JSON.stringify(developmentDefaults.env.ADMIN_PASSWORD)}`));assert.ok(content.includes('MOODLY_DEMO_MODE="false"'));}
  finally{await rm(root,{recursive:true,force:true});}
});
test('setup never overwrites an existing environment or generates shared credentials in production',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'moodly-env-'));
  try{assert.equal((await ensureEnvironment(root,{NODE_ENV:'production'})).productionSkipped,true);await writeFile(path.join(root,'.env.local'),'CUSTOM_OWNER_VALUE=keep\n');assert.equal((await ensureEnvironment(root,{NODE_ENV:'development'})).created,false);assert.equal(await readFile(path.join(root,'.env.local'),'utf8'),'CUSTOM_OWNER_VALUE=keep\n');}
  finally{await rm(root,{recursive:true,force:true});}
});

const runFile=promisify(execFile);
test('Codespaces create/start hooks automatically prepare and launch the site on port 3000',async()=>{
  const config=JSON.parse(await readFile('.devcontainer/devcontainer.json','utf8'));
  assert.equal(config.postCreateCommand,'bash .devcontainer/auto-start.sh --prepare');
  assert.equal(config.postStartCommand,'bash .devcontainer/auto-start.sh');
  assert.equal(config.waitFor,'postStartCommand');
  assert.deepEqual(config.forwardPorts,[3000]);
  assert.equal(config.portsAttributes['3000'].onAutoForward,'openBrowser');
});
test('Codespaces startup installs once, preserves env and reuses a healthy background server',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'moodly-codespaces-'));
  let serverPid:number|undefined;
  try{
    await mkdir(path.join(root,'.devcontainer'));await mkdir(path.join(root,'scripts'));await mkdir(path.join(root,'mock-bin'));
    const script=path.join(root,'.devcontainer/auto-start.sh');
    await writeFile(script,await readFile('.devcontainer/auto-start.sh','utf8'));
    await writeFile(path.join(root,'package-lock.json'),'{}\n');
    await writeFile(path.join(root,'.env.local'),'OWNER_CONFIGURATION=keep\n');
    await writeFile(path.join(root,'scripts/setup-env.mjs'),"import{existsSync,writeFileSync}from'node:fs';if(!existsSync('.env.local'))writeFileSync('.env.local','GENERATED_TEST_DEFAULTS=true\\n',{mode:0o600});");
    const npm=path.join(root,'mock-bin/npm');
    await writeFile(npm,`#!/usr/bin/env node
const fs=require('node:fs');
if(process.argv[2]==='ci'){
 fs.mkdirSync('node_modules/.bin',{recursive:true});fs.mkdirSync('node_modules/@next/env',{recursive:true});fs.mkdirSync('node_modules/postgres',{recursive:true});
 fs.writeFileSync('node_modules/.bin/next','',{mode:0o755});fs.writeFileSync('node_modules/@next/env/package.json','{}');fs.writeFileSync('node_modules/postgres/package.json','{}');
 const file='.data/mock-install-count';fs.writeFileSync(file,String(Number(fs.existsSync(file)?fs.readFileSync(file,'utf8'):0)+1));
}else if(process.argv[2]==='run'&&process.argv[3]==='dev'){
 const file='.data/mock-dev-count';fs.writeFileSync(file,String(Number(fs.existsSync(file)?fs.readFileSync(file,'utf8'):0)+1));
 fs.writeFileSync('.data/mock-server-running','true');setInterval(()=>{},1000);
}else process.exit(1);
`);
    const curl=path.join(root,'mock-bin/curl');
    await writeFile(curl,`#!/usr/bin/env node
const fs=require('node:fs');if(fs.existsSync('.data/mock-server-running'))process.stdout.write(JSON.stringify({products:[],inventory:[],settings:{},demo:false}));else process.exit(7);
`);
    await chmod(npm,0o755);await chmod(curl,0o755);
    const env:NodeJS.ProcessEnv={...process.env,PATH:path.join(root,'mock-bin')+path.delimiter+process.env.PATH,NODE_ENV:'development',CODESPACE_NAME:'moodly-startup-test',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev'};
    await runFile('bash',[script,'--prepare'],{cwd:root,env,encoding:'utf8',timeout:20000});
    const first=await runFile('bash',[script],{cwd:root,env,encoding:'utf8',timeout:20000});
    serverPid=Number(await readFile(path.join(root,'.data/codespaces-dev.pid'),'utf8'));
    assert.match(first.stdout,/https:\/\/moodly-startup-test-3000\.app\.github\.dev/);
    const second=await runFile('bash',[script],{cwd:root,env,encoding:'utf8',timeout:20000});
    assert.match(second.stdout,/Existing website reused/);
    assert.equal(await readFile(path.join(root,'.data/mock-install-count'),'utf8'),'1');
    assert.equal(await readFile(path.join(root,'.data/mock-dev-count'),'utf8'),'1');
    assert.equal(await readFile(path.join(root,'.env.local'),'utf8'),'OWNER_CONFIGURATION=keep\n');
  }finally{
    if(!serverPid){try{serverPid=Number(await readFile(path.join(root,'.data/codespaces-dev.pid'),'utf8'));}catch{}}
    if(serverPid&&Number.isInteger(serverPid)){try{process.kill(serverPid,'SIGTERM');}catch{}}
    await rm(root,{recursive:true,force:true});
  }
});
