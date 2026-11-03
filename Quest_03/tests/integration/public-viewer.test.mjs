import {viewerData} from './fixtures-viewer-state.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';import {handle} from '../../sites/orbit-booking/app/cloud-api.ts';
test('assessment viewer opens without password and blocks all data writes and owner access',async()=>{
 const env={CLOUD_SYNC_KEY:'synthetic-assessment-key',DB:{prepare(){return {bind(id){return {first:async()=>id==='owner-relay'?{data:JSON.stringify({instanceId:'pc'}),updated_at:Date.now()}:{data:JSON.stringify({instanceId:'pc',plans:viewerData}),updated_at:Date.now()}}}}}}},origin='https://viewer.example.invalid';
 const call=(route,method='GET')=>handle(new Request(origin+'/api/v1/'+route,{method,headers:{Origin:origin}}),env);
 assert.equal((await call('viewer/state')).status,200);assert.equal((await(await call('viewer/session')).json()).passwordRequired,false);
 for(const route of ['viewer/state','viewer/login','viewer/logout'])for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await call(route,method)).status,403);
 assert.equal((await call('owner/state')).status,401);assert.equal((await call('owner/tasks','POST')).status,401);
 const data=await(await call('viewer/state')).json();assert.equal(data.mode,'read-only');assert.equal(data.retained,true);assert.ok(!JSON.stringify(data).includes('access_token'));
});
