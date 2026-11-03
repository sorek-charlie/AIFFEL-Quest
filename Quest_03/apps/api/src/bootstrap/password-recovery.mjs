import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateSupabaseConfig} from '../infrastructure/persistence/supabase/todos.mjs';
// Dedicated loopback callback: recovery tokens remain in the browser fragment.
export function createPasswordRecovery(getConfig,root){
 return createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
  try{
   if(!/^(localhost|127\.0\.0\.1):\d+$/.test(req.headers.host||'')||req.method!=='GET')return send(403,{error:'허용되지 않은 요청입니다.'});
   const path=new URL(req.url,'http://localhost').pathname;
   const c=validateSupabaseConfig(getConfig()||{});
   res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' ${c.url}; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`);
   if(path==='/recovery-config'){if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return send(403,{});return send(200,{url:c.url,key:c.key});}
   const assets={'/reset-password':['reset-password.html','text/html'],'/recovery.mjs':['recovery.mjs','text/javascript'],'/recovery.css':['recovery.css','text/css']};
   const asset=assets[path];if(!asset)return send(404,{error:'찾을 수 없습니다.'});
   res.writeHead(200,{'Content-Type':asset[1]+'; charset=utf-8'});res.end(readFileSync(resolve(root,'apps/web/recovery',asset[0])));
  }catch{return send(503,{error:'PC 앱에서 Supabase 연결 정보를 먼저 저장하세요.'});}
 });
}
