// Isolate each viewport's dev server to avoid Turbopack + Chromium cache growth
// exhausting tiny 2GB test workspaces. This does not alter production auth or data.
import { spawn } from 'node:child_process';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
const widths=[320,360,390,430,768,1024,1440,1920];
const port=Number(process.env.RESPONSIVE_TEST_PORT??3040);
const dir='docs/verification/revision/matrix';
let server;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function stop(){if(!server)return;try{process.kill(-server.pid,'SIGTERM');}catch{}await new Promise(resolve=>{if(server.exitCode!==null)resolve();else{const timer=setTimeout(resolve,5000);server.once('exit',()=>{clearTimeout(timer);resolve();});}});server=undefined;}
async function run(){await mkdir(dir,{recursive:true});const reports=[];
 for(const width of widths){
  const env={...process.env,NODE_OPTIONS:'--max-old-space-size=768',MOODLY_TRUSTED_ORIGINS:'https://moodly-proxy-test.app.github.dev',TEST_BASE_URL:`http://127.0.0.1:${port}`,MOODLY_BROWSER_REPORT:`${dir}/browser-${width}.json`};
  let logs='';server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--turbopack','--hostname','0.0.0.0','--port',String(port)],{env,detached:true,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Dev server startup timed out.')),60000);const receive=chunk=>{logs+=chunk.toString();if(/Ready in/.test(logs)){clearTimeout(timer);resolve();}};server.stdout.on('data',receive);server.stderr.on('data',receive);server.once('exit',code=>{clearTimeout(timer);reject(new Error(`Dev server exited before ready (${code}).`));});});
  console.log(`Testing responsive viewport ${width}px on an isolated dev instance.`);
  const test=spawn(process.execPath,['node_modules/playwright/cli.js','test','--project',`width-${width}`],{env,stdio:['ignore','pipe','pipe']});let output='';test.stdout.on('data',chunk=>{output+=chunk.toString();process.stdout.write(chunk);});test.stderr.on('data',chunk=>{output+=chunk.toString();process.stderr.write(chunk);});const code=await new Promise(resolve=>test.once('exit',resolve));
  await stop();await writeFile(`${dir}/server-${width}.log`,logs);await writeFile(`${dir}/test-${width}.log`,output);reports.push(JSON.parse(await readFile(`${dir}/browser-${width}.json`,'utf8')));
  if(code!==0)throw new Error(`Responsive checks failed at ${width}px; see ${dir}/test-${width}.log.`);
  await pause(500);
 }
 const summary={viewportWidths:widths,passed:reports.reduce((sum,report)=>sum+report.stats.expected,0),failed:reports.reduce((sum,report)=>sum+report.stats.unexpected,0),skipped:reports.reduce((sum,report)=>sum+report.stats.skipped,0),isolatedDevelopmentServers:true};await writeFile('docs/verification/revision/responsive-summary.json',JSON.stringify(summary,null,2));console.log(summary);
}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{void stop().finally(()=>process.exit(1));});
run().catch(async error=>{await stop();console.error(error.message);process.exitCode=1;});
