import {cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
// Browser assets only. API, DB, settings and credentials are excluded.
rmSync('sites/orbit-booking/public/src',{recursive:true,force:true});
cpSync('apps/web/src','sites/orbit-booking/public/src',{recursive:true});
writeFileSync('sites/orbit-booking/public/owner.html',readFileSync('apps/web/index.html','utf8'));
console.log('Prepared personal scheduler browser assets.');

cpSync('packages/domain/src/tasks/public-plans.mjs','sites/orbit-booking/app/public-plans.mjs');
