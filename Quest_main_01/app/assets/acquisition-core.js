(function(root){'use strict';
const HOSTS=['www.hometax.go.kr','hometax.go.kr','www.nts.go.kr','total.comwel.or.kr','total.kcomwel.or.kr','si4n.nhis.or.kr','edi.nhis.or.kr','www.nhis.or.kr','moel.go.kr','www.gov.kr','www.4insure.or.kr'];
function officialUrl(value){const u=new URL(value);if(u.protocol!=='https:'||!HOSTS.includes(u.hostname)||u.username||u.password||u.port)throw Error('허용된 공식기관 HTTPS 주소가 아닙니다.');return u.href}
function text(value,max=800){if(typeof value!=='string'||value.length>max)throw Error('경로 자료의 문자열 형식·길이를 확인하세요.');return value}
function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw Error('날짜 형식 오류');return value}
function validate(p,requiredIds=[]){
 if(!p||p.schema!==1||!/^\d{4}\.\d{2}\.\d{2}\.\d{1,6}$/.test(p.version)||!Array.isArray(p.routes)||p.routes.length<1||p.routes.length>60)throw Error('기관 경로 JSON 형식 오류');
 const ids=new Set(),routes=p.routes.map(r=>{if(!/^[a-z][a-z0-9-]{0,60}$/.test(r.id)||ids.has(r.id))throw Error('경로 ID 중복·오류');ids.add(r.id);if(!Array.isArray(r.menu)||r.menu.length<1||r.menu.length>20)throw Error('메뉴 단계 오류');
 if(!['tax','employment','carry','insurance','salary','contracts'].includes(r.intent))throw Error('자료 종류 오류');
 const from=date(r.policyFrom),to=date(r.policyTo);if(from>to)throw Error('적용 기간 오류');
 const automationMenu=Array.isArray(r.automationMenu)?r.automationMenu.slice(0,20).map(v=>text(v,200)):[];if(automationMenu.some(m=>/^(신청|제출|접수|확인|납부|결제|등록|삭제|동의|전송|수정|취소)$/.test(m.trim())))throw Error('자료 조회가 아닌 제출·변경 동작은 자동 수집 경로로 사용할 수 없습니다.');
 return{id:r.id,name:text(r.name,150),agency:text(r.agency,150),url:officialUrl(r.url),source:officialUrl(r.source),menu:r.menu.map(v=>text(v,200)),automationMenu,years:text(r.years,150),intent:r.intent,attached:Array.isArray(r.attached)?r.attached.slice(0,50).map(v=>text(v,250)):[],export:text(r.export,100),note:text(r.note,1500),checkedAt:date(r.checkedAt),routeStatus:text(r.routeStatus,100),policyFrom:from,policyTo:to};});
 if(requiredIds.some(id=>!ids.has(id)))throw Error('기존 필수 수집경로가 빠졌습니다.');
 return{schema:1,version:p.version,publishedAt:date(p.publishedAt),routes,notices:Array.isArray(p.notices)?p.notices.slice(0,20).map(n=>({name:text(n.name,100),url:officialUrl(n.url)})):[]};
}
function versionCompare(a,b){const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<4;i++){if(x[i]!==y[i])return x[i]>y[i]?1:-1}return 0}
function changes(old,next){const before=validate(old),after=validate(next);return after.routes.filter(r=>{const o=before.routes.find(x=>x.id===r.id);return!o||JSON.stringify(o)!==JSON.stringify(r)}).map(r=>r.name)}
const api={officialUrl,validate,versionCompare,changes};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AcquisitionCore=api;
})(typeof window!=='undefined'?window:globalThis);
