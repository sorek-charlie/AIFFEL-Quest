import {extractUpload} from '../infrastructure/documents/uploads.mjs';
import {createPasswordRecovery} from './password-recovery.mjs';
import {createMailReview} from '../application/mail-review.mjs';
import {createTodoWorkspace} from './todo-workspace.mjs';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createRepository } from '../infrastructure/persistence/sqlite/index.mjs';
import { createScheduler } from '../application/scheduler.mjs';
import {createPasswordAuth} from '../infrastructure/auth/password.mjs';
import {createInputs} from '../application/inputs.mjs';
import {createOwnerRelay} from '../infrastructure/calendar-providers/owner-relay.mjs';
import {createGoogle} from '../infrastructure/calendar-providers/google.mjs';
import {createSyncManager} from '../infrastructure/calendar-providers/sync-manager.mjs';
import {textCandidates} from '../../../../packages/domain/src/tasks/extraction.mjs';
import { requireValue } from '../../../../packages/domain/src/index.mjs';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
export function createApp({dbPath, ownerId='local-owner', launchToken=randomBytes(32).toString('hex')}={}) {
  requireValue(process.env.NODE_ENV!=='production','로컬 인증으로 운영 실행할 수 없습니다.');
  const repo=createRepository(dbPath||resolve(root,'runtime/data/orbit.db'),root),app=createScheduler(repo);
  app.initialize(ownerId);
  const todoWorkspace=createTodoWorkspace(repo,ownerId,app,root);
  const auth=createPasswordAuth(repo,ownerId),inputs=createInputs(repo,ownerId),google=createGoogle(repo,ownerId,inputs),sync=createSyncManager(repo,ownerId,google,inputs,{manualOnly:process.env.ORBIT_GOOGLE_IMPORT_ONLY==='1'});
  const mailReview=createMailReview({repo,owner:ownerId,inputs,provider:()=>google.mailbox()});
  const sessions=new Map(),limits=new Map();
  const server=createServer(async(req,res)=>{
    const origin=`http://${req.headers.host}`;
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
    try {
      requireValue(/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host||''),'허용되지 않은 주소입니다.',403,'FORBIDDEN');
      const url=new URL(req.url,origin),p=url.pathname;
      if(!p.startsWith('/api/')) {
        const web=resolve(root,'apps/web');const file=p.startsWith('/src/')?resolve(web,'.'+p):resolve(web,'index.html');
        requireValue(file.startsWith(web+sep)&&['.html','.mjs','.css','.woff2'].includes(extname(file)),'찾을 수 없습니다.',404,'NOT_FOUND');
        res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2'})[extname(file)]});res.end(readFileSync(file));return;
      }
      const now=Date.now(),bucket=limits.get(req.socket.remoteAddress)||{since:now,count:0};
      if(now-bucket.since>60000) {bucket.since=now;bucket.count=0;}bucket.count++;limits.set(req.socket.remoteAddress,bucket);
      requireValue(bucket.count<=300,'요청이 많습니다. 잠시 후 다시 시도하세요.',429,'RATE_LIMITED');
      let b={};
      if(!['GET','HEAD'].includes(req.method)) {
        requireValue(req.headers.origin===origin,'같은 앱에서 요청하세요.',403,'FORBIDDEN');
        requireValue((req.headers['content-type']||'').startsWith('application/json'),'JSON 요청만 허용합니다.',415);
        let raw='';for await(const chunk of req) {raw+=chunk;requireValue(Buffer.byteLength(raw)<(p==='/api/v1/owner/inputs/upload'?12*1024*1024:262144),'요청이 너무 큽니다.',413);}
        try { b=JSON.parse(raw||'{}'); } catch {requireValue(false,'JSON을 확인하세요.');}
        requireValue(b && typeof b==='object'&&!Array.isArray(b),'입력을 확인하세요.');
      }
      const cookieToken=(req.headers.cookie||'').match(/(?:^|; )orbit=([^;]+)/)?.[1];
      const authenticated=()=>sessions.get(cookieToken)>now;
      if(p==='/api/v1/auth/session'&&req.method==='GET'){send(200,{configured:auth.configured(),authenticated:authenticated()});return;}
      if(p==='/api/v1/auth/change-password'&&req.method==='POST'){await auth.change(b.currentPassword,b.newPassword);sessions.clear();send(200,{ok:true});return;}
      if(p==='/api/v1/auth/google/callback'&&req.method==='GET'){const connected=await google.callback(url,t=>sessions.get(t)>Date.now());res.writeHead(303,{Location:connected.gmailReview?'/?view=gmail':connected.calendarOnly?'/?view=google&google=connected':'/?google=connected'});res.end();return;}
      if((p==='/api/v1/auth/login'||p==='/api/v1/auth/setup')&&req.method==='POST') {
        if(p.endsWith('/setup')){requireValue(typeof b.launchToken==='string'&&b.launchToken===launchToken,'프로그램 실행 창에서 초기 설정을 시작하세요.',403);await auth.setup(b.password);}else await auth.verify(b.password);
        const token=randomBytes(32).toString('hex');sessions.set(token,now+12*3600000);
        res.setHeader('Set-Cookie',`orbit=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);send(200,{ok:true});return;
      }
      if(p==='/api/v1/auth/logout'&&req.method==='POST') { const t=(req.headers.cookie||'').match(/(?:^|; )orbit=([^;]+)/)?.[1];sessions.delete(t);res.setHeader('Set-Cookie','orbit=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');send(200,{ok:true});return; }
      const m=p.match(/^\/api\/v1\/owner\/(.*)$/);
      if(m) {
        requireValue(authenticated(),'비밀번호를 입력해 로그인하세요.',401,'UNAUTHENTICATED');
        const route=m[1];let result;
        if(route==='gmail-review/status'&&req.method==='GET')result=mailReview.status({category:url.searchParams.get('category')||'all',page:url.searchParams.get('page')||1});
        else if(route==='gmail-review/start'&&req.method==='POST')result=mailReview.start(b);
        else if(/^gmail-review\/messages\/[^/]+$/.test(route)&&req.method==='POST')result=await mailReview.action(route.split('/')[2],b);
        else if(route.startsWith('todo/'))result=await todoWorkspace.handle(route,req.method,b,cookieToken);
        else if(route==='state'&&req.method==='GET') result=app.state(ownerId);
        else if(route==='inputs/upload'&&req.method==='POST'){requireValue(b.kind===undefined||['event','task','project'].includes(b.kind),'입력 종류를 확인하세요.');const candidates=await extractUpload(b,root);result=inputs.ingest('manual',candidates.map(item=>({...item,kind:b.kind||item.kind,...(b.kind==='task'&&item.startsAt?{dueDate:new Date(Date.parse(item.startsAt)+9*3600000).toISOString().slice(0,10)}:{})})));if(candidates.metadata)result.pdf=candidates.metadata;}
        else if(route==='inputs'&&req.method==='GET')result=inputs.list();
        else if(route==='inputs/text'&&req.method==='POST'){requireValue(typeof b.text==='string'&&b.text.length<=100000,'100,000자 이하의 내용을 입력하세요.');result=inputs.ingest('manual',textCandidates(b.text));}
        else if(/^inputs\/[^/]+\/confirm$/.test(route)&&req.method==='POST')result=inputs.confirm(route.split('/')[1],b);
        else if(route==='integrations'&&req.method==='GET')result=sync.status();
        else if(route==='integrations'&&req.method==='PUT')result=sync.configure(b);
        else if(route==='integrations/gmail/check'&&req.method==='POST')result=await sync.run('gmail');
        else if(route==='integrations/force'&&req.method==='POST')result=await sync.run();
        else if(route==='integrations/google/config'&&req.method==='PUT'){google.configure(b);result=google.status();}
        else if(route==='integrations/google/connect'&&req.method==='POST')result=google.connect(origin,cookieToken,{calendarOnly:b.calendarOnly===true,gmailReview:b.gmailReview===true});
        else if(route==='integrations/google/preview'&&req.method==='POST')result=await google.preview(b,cookieToken);
        else if(route==='integrations/google/import'&&req.method==='POST')result=google.importPreview(b,cookieToken);
        else if(route==='integrations/google/disconnect'&&req.method==='POST'){google.disconnect();result={ok:true};}
        else if(route==='settings'&&req.method==='PUT') result=app.updateSettings(ownerId,b);
        else if(/^(tasks|events|projects)(\/[^/]+)?$/.test(route)&&['POST','PATCH','DELETE'].includes(req.method)) {
          const [kind,id]=route.split('/');requireValue(req.method==='POST'?!id:!!id,'요청 경로를 확인하세요.');result=app.mutate(ownerId,kind==='tasks'?'task':kind==='projects'?'project':'event',req.method,id,b);
        } else requireValue(false,'경로를 찾을 수 없습니다.',404,'NOT_FOUND');
        send(200,result);return;
      }
      send(404,{error:{code:'NOT_FOUND',message:'찾을 수 없습니다.'}});
    } catch(e) { send(e.status||500,{error:{code:e.code||'INTERNAL_ERROR',message:e.status?e.message:'처리하지 못했습니다. 다시 시도하세요.'}}); }
  });
  const ownerRelay=createOwnerRelay(repo,ownerId,()=>server.listening?`http://127.0.0.1:${server.address().port}`:null);
  server.on('close',()=>{ownerRelay.close();sync.close();repo.close();});
  server.on('listening',()=>{ownerRelay.start();});
  const recovery=createPasswordRecovery(()=>repo.config(ownerId,'todo-cloud'),root);
  server.on('close',()=>{if(recovery.listening)recovery.close();});
  return {server,launchToken,recovery};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const data=process.env.ORBIT_DATA_DIR||resolve(root,'runtime/data');mkdirSync(data,{recursive:true});
  const {server,launchToken,recovery}=createApp({dbPath:resolve(data,'orbit.db')});
  server.listen(Number(process.env.PORT||0),'127.0.0.1',()=>console.log(`ORBIT_URL=http://127.0.0.1:${server.address().port}/#launch=${launchToken}`));
  recovery.on('error',()=>console.error('RECOVERY: localhost:3000 사용 불가. 해당 포트를 사용하는 다른 프로그램을 확인하세요.'));
  recovery.listen(3000,'127.0.0.1');
  process.on('SIGTERM',()=>server.close());
}

