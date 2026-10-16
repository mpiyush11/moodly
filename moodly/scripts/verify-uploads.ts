import { loadEnvConfig } from '@next/env';
import { readFile,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { cleanupTestUploads } from './test-artifacts';
loadEnvConfig(process.cwd(),true);
const base=process.env.TEST_BASE_URL??'http://127.0.0.1:3000';
async function main(){
  const store=await(await fetch(`${base}/api/store`)).json();if(!store.demo&&!store.development)throw new Error('Upload automation is restricted to the approved test modes.');
  const uploadedUrls:string[]=[];
  try {
  const origin=new URL(base).origin;
  const auth=await fetch(`${base}/api/admin/auth`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'x-forwarded-for':'upload-suite'},body:JSON.stringify({email:'studio@moodly.local',password:store.development?process.env.ADMIN_PASSWORD:(process.env.DEMO_ADMIN_PASSWORD??'MoodlyStudio2026!')})});
  assert.equal(auth.status,200);const cookie=auth.headers.get('set-cookie')!.split(';')[0];
  const headers={Origin:origin,Cookie:cookie,'x-forwarded-for':'upload-suite'};
  const bytes=await readFile('public/images/tee-black.jpg');
  for(let attempt=0;attempt<3;attempt++){
    const form=new FormData();form.set('file',new File([bytes],'tee.jpg',{type:'image/jpeg'}));
    const response=await fetch(`${base}/api/admin/upload`,{method:'POST',headers,body:form});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));uploadedUrls.push(data.url);
    const image=await fetch(`${base}${data.url}`);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');assert.deepEqual(Buffer.from(await image.arrayBuffer()),bytes);
  }
  const svg=new FormData();svg.set('file',new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],'unsafe.svg',{type:'image/svg+xml'}));
  assert.equal((await fetch(`${base}/api/admin/upload`,{method:'POST',headers,body:svg})).status,400);
  const huge=new FormData();huge.set('file',new File([new Uint8Array(6*1024*1024)],'huge.jpg',{type:'image/jpeg'}));
  assert.equal((await fetch(`${base}/api/admin/upload`,{method:'POST',headers,body:huge})).status,413);
  assert.equal((await fetch(`${base}/api/admin/upload`,{method:'POST',headers:{...headers,'Content-Type':'multipart/form-data; boundary=broken'},body:'malformed'})).status,400);
  const unauthorised=new FormData();unauthorised.set('file',new File([bytes],'tee.jpg',{type:'image/jpeg'}));
  assert.equal((await fetch(`${base}/api/admin/upload`,{method:'POST',headers:{Origin:origin},body:unauthorised})).status,401);
  const evidence={mode:store.development?'Shared test catalogue / local workspace uploads':'Explicit local demo',repeatedJpegUploads:3,exactByteReadback:true,svgRejected:true,oversizedBodyRejected:true,malformedMultipartRejected:true,unauthorisedUploadRejected:true,liveStorageVerification:false};
  await writeFile('docs/verification/revision/upload-results.json',JSON.stringify(evidence,null,2));console.log('✓ Three protected JPG uploads with exact byte readback.');console.log('✓ SVG, oversized body, malformed multipart, and unauthorised uploads rejected.');
  } finally { await cleanupTestUploads(uploadedUrls); }
}
main().catch(error=>{console.error(error);process.exit(1);});
