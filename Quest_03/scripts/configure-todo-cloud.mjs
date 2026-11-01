import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {createRepository} from '../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {validateSupabaseConfig} from '../apps/api/src/infrastructure/persistence/supabase/todos.mjs';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for private Todo configuration on stdin (hidden).');
const lines=createInterface({input:process.stdin,terminal:false});
for await(const line of lines){const b=JSON.parse(line),config=validateSupabaseConfig(b);const repo=createRepository(process.env.ORBIT_DB_PATH||resolve('runtime/data/orbit.db'),resolve('.'));try{repo.saveConfig('local-owner','todo-cloud',{...config,provider:'supabase'});if(b.A&&b.B){for(const user of [b.A,b.B])if(!/^[a-z0-9-]+@example\.invalid$/.test(user.email)||typeof user.password!=='string')throw Error('Only synthetic test accounts may be provisioned.');repo.saveConfig('local-owner','todo-test-accounts',{A:b.A,B:b.B});}console.log('Saved encrypted local Todo connection. No credentials printed.');}finally{repo.close();}break;}lines.close();
