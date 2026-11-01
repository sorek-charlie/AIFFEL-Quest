import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cloudOrigin,CLOUD_ORIGIN} from '../../apps/api/src/infrastructure/calendar-providers/cloud-origin.mjs';
import {createOwnerRelay} from '../../apps/api/src/infrastructure/calendar-providers/owner-relay.mjs';
test('cloud URL migration accepts the exact legacy origin and rejects untrusted hosts',()=>{
 assert.equal(cloudOrigin('https://orbit-appointments-quest03.cherrysocute9.chatgpt.site'),CLOUD_ORIGIN);
 assert.equal(cloudOrigin(CLOUD_ORIGIN),CLOUD_ORIGIN);
 for(const url of ['https://evil.invalid',CLOUD_ORIGIN+'.evil.invalid',CLOUD_ORIGIN+'/path'])assert.throws(()=>cloudOrigin(url));
});
test('owner relay retries when connection configuration becomes available after startup',async()=>{
 const original=globalThis.fetch;let config=null,calls=0;
 globalThis.fetch=async url=>{assert.equal(String(url),CLOUD_ORIGIN+'/api/v1/bridge/owner');calls++;return Response.json({requests:[]});};
 const relay=createOwnerRelay({config:()=>config},'A',()=>null);
 try{relay.start();config={url:'https://orbit-appointments-quest03.cherrysocute9.chatgpt.site',secret:'synthetic-test-only'};await new Promise(r=>setTimeout(r,1350));assert.equal(calls,1);}finally{relay.close();globalThis.fetch=original;}
});
