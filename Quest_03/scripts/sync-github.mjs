import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,readdirSync,rmSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'), checkout=resolve(root,'build/submission-repo'), target=resolve(checkout,'Quest_03'), baseline=resolve(root,'build/github-sync-base.json');
if(existsSync(resolve(root,'.github-updates-blocked'))){console.error('GitHub 업데이트가 사용자 요청으로 차단되었습니다. 로컬 작업만 허용합니다.');process.exit(3);}
function git(...args){const r=spawnSync('git',['-C',checkout,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout.trim();}
const excluded=new Set(['.git','.github-updates-blocked','korean schedule','.env','node_modules','build','dist','runtime','.sites-runtime','.wrangler','.vinext','.playwright-mcp','.codex','.agents','outputs','evidence','smoke-result.txt','.secrets','secrets']);
function files(dir,prefix=''){const out=new Map();if(!existsSync(dir))return out;for(const e of readdirSync(dir,{withFileTypes:true})){if(excluded.has(e.name)||/^(?:\.dev\.vars|credentials.*\.json$|client_secret.*\.json$|oauth-token.*\.json$)/i.test(e.name)||e.name.startsWith('.env.')&&e.name!=='.env.example'||/\.(exe|apk|zip|db|sqlite3?|log|pem|key)$/i.test(e.name))continue;const p=prefix+e.name,full=resolve(dir,e.name);if(e.isSymbolicLink())continue;if(e.isDirectory())for(const [k,v]of files(full,p+'/'))out.set(k,v);else if(e.isFile())out.set(p,createHash('sha256').update(readFileSync(full)).digest('hex'));}return out;}
if(process.argv.includes('--watch')){console.log('30초마다 양방향 소스 동기화. Ctrl+C로 종료.');const run=()=>{const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--apply'],{stdio:'inherit'});if(r.status!==0){console.error('동기화 중단: 오류를 해결한 뒤 다시 실행하세요.');process.exit(r.status||1);}};run();setInterval(run,30000);}else {
mkdirSync(dirname(checkout),{recursive:true});
if(!existsSync(resolve(checkout,'.git'))){const r=spawnSync('git',['clone','https://github.com/sorek-charlie/AIFFEL-Quest.git',checkout],{stdio:'inherit'});if(r.status)throw Error('GitHub clone failed');}
if(git('status','--porcelain'))throw Error('제출 저장소에 미커밋 변경이 있습니다. 먼저 검토하세요.');
git('pull','--ff-only','origin','main');mkdirSync(target,{recursive:true});
const local=files(root),remote=files(target),base=existsSync(baseline)?JSON.parse(readFileSync(baseline,'utf8')):(process.argv.includes('--initialize-local')?Object.fromEntries(remote):{}),plans=[],conflicts=[];
for(const p of new Set([...local.keys(),...remote.keys(),...Object.keys(base)])){
 const l=local.get(p),r=remote.get(p),b=base[p];if(l===r)continue;
 if(b===undefined&&l!==undefined&&r!==undefined){conflicts.push(p);continue;}
 if(l!==b&&r!==b){conflicts.push(p);continue;}
 plans.push({p,from:l!==b?root:target,to:l!==b?target:root,deleted:(l!==b?l:r)===undefined});
}
if(conflicts.length)throw Error('양쪽 변경 충돌: '+conflicts.join(', ')+' — 덮어쓰지 않았습니다.');
if(!process.argv.includes('--apply')){console.log(JSON.stringify({mode:'preview',changes:plans},null,2));process.exit(0);}
for(const {p,from,to,deleted}of plans){const dest=resolve(to,p);if(!dest.startsWith(to+'\\')&&!dest.startsWith(to+'/'))throw Error('Unsafe path');const current=files(to).get(p),expected=to===root?local.get(p):remote.get(p);if(current!==expected)throw Error('동기화 중 파일 변경 감지: '+p);if(deleted)rmSync(dest,{force:true});else{mkdirSync(dirname(dest),{recursive:true});copyFileSync(resolve(from,p),dest);}}
// Remove legacy binary from GitHub while retaining the local executable.
git('rm','--ignore-unmatch','--','Quest_03/ORBIT-Scheduler.exe');
git('add','--','Quest_03');
if(git('diff','--cached','--name-only'))git('commit','-m','Sync Quest_03 source and documentation; keep executable local');
git('push','origin','HEAD:main');
// Record the synchronized snapshot, never edits made locally during the push.
writeFileSync(baseline,JSON.stringify(Object.fromEntries(files(target)),null,2));
console.log('GitHub와 로컬 소스 동기화 완료. exe와 개인 데이터는 제외했습니다.');

}
