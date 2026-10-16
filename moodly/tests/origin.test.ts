import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTrustedRequestOrigin,normalizeOrigin } from '../src/lib/origin';
const request=(origin:string,headers:Record<string,string>={})=>new Request('http://localhost:3000/api/admin/auth',{headers:{origin,host:'localhost:3000',...headers}});
test('same-origin local and HTTPS forwarded-host requests pass',()=>{
  assert.equal(isTrustedRequestOrigin(request('http://localhost:3000')),true);
  assert.equal(isTrustedRequestOrigin(request('https://shop.example.com',{'x-forwarded-host':'shop.example.com, proxy.internal','x-forwarded-proto':'https'})),true);
});
test('Codespaces public origin is recognised even when the proxy rewrites both hosts',()=>{
  const env={NODE_ENV:'development',CODESPACE_NAME:'friendly-moodly-123',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev'};
  assert.equal(isTrustedRequestOrigin(request('https://friendly-moodly-123-3000.app.github.dev'),env),true);
  assert.equal(isTrustedRequestOrigin(request('https://another-workspace-3000.app.github.dev'),env),false);
});
test('request public URL remains valid when forwarded host contains an internal address',()=>{
  const req=new Request('https://moodly.example.com/api/admin/auth',{headers:{Origin:'https://moodly.example.com',Host:'localhost:3000','x-forwarded-host':'localhost:3000','x-forwarded-proto':'https'}});
  assert.equal(isTrustedRequestOrigin(req),true);
});
test('explicit canonical origin supports trusted production proxies without wildcards',()=>{
  assert.equal(isTrustedRequestOrigin(request('https://moodly.example.com'),{NEXT_PUBLIC_SITE_URL:'https://moodly.example.com'}),true);
  assert.equal(isTrustedRequestOrigin(request('https://evil.example.com'),{NEXT_PUBLIC_SITE_URL:'https://moodly.example.com'}),false);
});
test('CSRF, malformed origins, alternate ports, and null origins fail closed',()=>{
  assert.equal(isTrustedRequestOrigin(request('https://attacker.example')),false);
  assert.equal(isTrustedRequestOrigin(request('http://localhost:3001')),false);
  assert.equal(isTrustedRequestOrigin(request('http://localhost:3000',{'sec-fetch-site':'cross-site'})),false);
  for(const value of ['null','file:///tmp/test','https://user:password@localhost:3000','http://localhost:3000/path','http://localhost:3000?query=1'])assert.equal(normalizeOrigin(value),null);
});
