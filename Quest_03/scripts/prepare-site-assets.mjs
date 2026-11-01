import {cpSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
// Browser-only source. Never copy API, DB, config, credentials or runtime data.
cpSync('apps/web/src','sites/orbit-booking/public/src',{recursive:true});
writeFileSync('sites/orbit-booking/public/owner.html',readFileSync('apps/web/index.html','utf8').replace('이성진 · 나의 시간 공간','이성진 · 나의 관리자 터미널'));
writeFileSync('sites/orbit-booking/public/booking.html',readFileSync('apps/web/index.html','utf8').replace('이성진 · 나의 시간 공간','이성진 · 고객 미팅 신청').replace('/src/app/main.mjs','/src/public-entry.mjs'));
copyFileSync('apps/api/src/infrastructure/calendar-providers/relay-crypto.mjs','sites/orbit-booking/app/relay-crypto.mjs');
console.log('Prepared owner browser assets and shared relay cryptography.');
