import {scrypt,randomBytes,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {requireValue} from '../../../../../packages/domain/src/index.mjs';
const derive=promisify(scrypt);
export function createPasswordAuth(repo,owner) {
 let failures=0,lockedUntil=0;
 const validate=p=>requireValue(typeof p==='string'&&p.length>=8&&p.length<=128,'비밀번호는 8~128자로 입력하세요.');
 async function verify(password) {
  requireValue(Date.now()>=lockedUntil,'로그인 시도가 많습니다. 15분 뒤 다시 시도하세요.',429,'LOGIN_LOCKED');
  const stored=repo.password(owner),salt=stored?.salt||'invalid-password-salt';
  const result=await derive(typeof password==='string'?password.slice(0,128):'',salt,64);
  const ok=!!stored&&timingSafeEqual(result,Buffer.from(stored.hash,'hex'));
  if(!ok){if(++failures>=6){lockedUntil=Date.now()+15*60000;failures=0;}requireValue(false,'비밀번호를 확인하세요.',401,'UNAUTHENTICATED');}
  failures=0;return true;
 }
 async function save(password){validate(password);const salt=randomBytes(32).toString('hex'),hash=(await derive(password,salt,64)).toString('hex');repo.savePassword(owner,salt,hash);}
 return {configured:()=>!!repo.password(owner),verify,async setup(p){requireValue(!repo.password(owner),'초기 비밀번호가 이미 설정되었습니다.',409,'ALREADY_CONFIGURED');validate(p);const salt=randomBytes(32).toString('hex'),hash=(await derive(p,salt,64)).toString('hex');repo.transaction(()=>{requireValue(!repo.password(owner),'초기 설정이 이미 완료되었습니다.',409);repo.savePassword(owner,salt,hash);});},async change(old,next){await verify(old);await save(next);}};
}
