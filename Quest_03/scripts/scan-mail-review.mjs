import {resolve} from 'node:path';
import {createRepository} from '../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createInputs} from '../apps/api/src/application/inputs.mjs';
import {createGoogle} from '../apps/api/src/infrastructure/calendar-providers/google.mjs';
import {createMailReview} from '../apps/api/src/application/mail-review.mjs';
const [from,to,count='100']=process.argv.slice(2);
const repo=createRepository(process.env.ORBIT_DB_PATH||resolve('runtime/data/orbit.db'),resolve('.'));
try{const owner='local-owner',inputs=createInputs(repo,owner),google=createGoogle(repo,owner,inputs),review=createMailReview({repo,owner,inputs,provider:()=>google.mailbox()});review.start({from,to,limit:Number(count)});let last='';while(review.status().job.state==='running'){const job=review.status().job,label=`Read ${job.completed}/${job.total}`;if(label!==last){console.log(label);last=label;}await new Promise(r=>setTimeout(r,2000));}const s=review.status();if(s.job.state==='error')throw Error(s.job.error);console.log(JSON.stringify({counts:s.counts,truncated:s.truncated,from:s.from,to:s.to}));}finally{repo.close();}
