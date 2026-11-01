import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {createRepository} from '../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../apps/api/src/application/scheduler.mjs';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
const readline=createInterface({input:process.stdin,terminal:false});console.log('Ready for connection JSON on stdin (hidden).');
for await(const line of readline){const data=JSON.parse(line);if(!/^[a-f0-9]{64}$/.test(data.secret))throw new Error('Invalid connection key');const repo=createRepository(process.env.ORBIT_DB_PATH,resolve('.'));try{const app=createScheduler(repo);app.initialize('local-owner');repo.saveConfig('local-owner','public-cloud',{url:data.url,secret:data.secret});const state=app.state('local-owner');app.updateSettings('local-owner',{...state.settings,enabled:true});console.log('Public booking connection configured; private data was not printed.');}finally{repo.close();}break;}readline.close();
