import {createApp} from '../apps/api/src/bootstrap/server.mjs';
import {mkdirSync} from 'node:fs';
mkdirSync('build/ui-qa',{recursive:true});
const {server,launchToken}=createApp({dbPath:'build/ui-qa/orbit.db'});
const port=Number(process.env.QA_PORT||43170);
server.listen(port,'127.0.0.1',async()=>{
 const base='http://127.0.0.1:'+port;
 const request=(path,body,cookie)=>fetch(base+'/api/v1/'+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 const session=await (await fetch(base+'/api/v1/auth/session')).json();
 const r=await request(session.configured?'auth/login':'auth/setup',{password:'Synthetic-QA-Only-123',launchToken});
 if(!r.ok)throw Error('QA setup failed');
 console.log('QA_URL='+base);console.log('Synthetic fixture only; no customer database.');
});
process.on('SIGTERM',()=>server.close());
