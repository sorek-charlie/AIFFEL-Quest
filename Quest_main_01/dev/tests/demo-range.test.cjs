const test=require('node:test'),assert=require('node:assert/strict');
const workerPromise=import('../cloudflare/worker.mjs');
const address='https://example.test/outputs/main-quest/video/main-quest-capture-introduction-1080p.mp4';
const env={ASSETS:{fetch:async()=>new Response('0123456789',{headers:{'Content-Type':'video/mp4','Content-Length':'10','ETag':'"test"'}})}};
async function request(headers={},method='GET'){return(await workerPromise).default.fetch(new Request(address,{method,headers}),env,{waitUntil(){}})}
test('public demo announces byte ranges and retains full playback',async()=>{
 const r=await request();assert.equal(r.status,200);assert.equal(r.headers.get('Accept-Ranges'),'bytes');assert.equal(await r.text(),'0123456789');
});
test('video seek returns only requested bytes with range metadata',async()=>{
 const r=await request({Range:'bytes=3-6'});assert.equal(r.status,206);assert.equal(r.headers.get('Content-Range'),'bytes 3-6/10');assert.equal(r.headers.get('Content-Length'),'4');assert.equal(await r.text(),'3456');
});
test('open, suffix and bounded ranges work',async()=>{
 assert.equal(await(await request({Range:'bytes=7-'})).text(),'789');
 assert.equal(await(await request({Range:'bytes=-3'})).text(),'789');
 assert.equal(await(await request({Range:'bytes=8-100'})).text(),'89');
});
test('invalid or unsatisfiable video ranges are rejected',async()=>{
 for(const Range of ['bytes=99-','bytes=6-2','bytes=-0','bytes=-','bytes=0-1,3-4','garbage']){
  const r=await request({Range});assert.equal(r.status,416,Range);assert.equal(r.headers.get('Content-Range'),'bytes */10');
 }
});
test('HEAD has no payload and an outdated If-Range returns full content',async()=>{
 const head=await request({Range:'bytes=0-3'},'HEAD');assert.equal(head.status,206);assert.equal(await head.text(),'');
 const r=await request({Range:'bytes=3-5','If-Range':'"old"'});assert.equal(r.status,200);assert.equal(await r.text(),'0123456789');
});
