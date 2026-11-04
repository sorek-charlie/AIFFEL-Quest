const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../../app/assets/acquisition-core.js');
const base=JSON.parse(fs.readFileSync('app/data/acquisition_routes.json','utf8'));
test('all attached files mapped once, actual payment distinguished from rates and derived summary',()=>{
 const r=C.validate(base);assert.equal(r.routes.length,11);const files=r.routes.flatMap(x=>x.attached);assert.deepEqual(files,[]);
 assert.match(r.routes.find(x=>x.id==='insurance-rate').note,/実|실납부/);assert.match(r.routes.find(x=>x.id==='derived-summary').note,/동일.*보장하지/);assert(!r.routes.some(x=>x.id.startsWith('grant-')));
});
test('route updates cannot execute script, redirect to other domains, omit mandatory rows or inject credentials',()=>{
 for(const bad of ['http://www.hometax.go.kr/','https://www.hometax.go.kr.evil.test/','javascript:alert(1)','https://user:password@www.work24.go.kr/','https://www.work24.go.kr:8443/'])assert.throws(()=>C.officialUrl(bad));
 let p=structuredClone(base);p.routes[0].url='https://evil.test';assert.throws(()=>C.validate(p));p=structuredClone(base);p.routes.pop();assert.throws(()=>C.validate(p,base.routes.map(r=>r.id)),/필수/);
});
test('update is a separate versioned data manifest and preserves historical applicability',()=>{
 const next=structuredClone(base);next.version='2026.10.26.1';next.publishedAt='2026-10-26';next.routes[0].menu.push('변경 메뉴');
 const approved=C.validate(next,base.routes.map(r=>r.id));assert.equal(C.versionCompare(approved.version,base.version),1);assert.deepEqual(C.changes(base,approved),[base.routes[0].name]);assert.equal(approved.routes[0].policyFrom,'2021-01-01');assert.equal(base.routes[0].menu.includes('변경 메뉴'),false);
});
test('malformed duplicate IDs, invalid dates and reversed applicability rejected',()=>{
 let p=structuredClone(base);p.routes[1].id=p.routes[0].id;assert.throws(()=>C.validate(p));p=structuredClone(base);p.routes[0].checkedAt='2026-02-31';assert.throws(()=>C.validate(p));p=structuredClone(base);p.routes[0].policyTo='2020-01-01';assert.throws(()=>C.validate(p));
});
