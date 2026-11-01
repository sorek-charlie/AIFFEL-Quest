import {resolve} from 'node:path';
import {createRepository} from '../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../apps/api/src/application/scheduler.mjs';
import {createPublicCloud} from '../apps/api/src/infrastructure/calendar-providers/public-cloud.mjs';
const repo=createRepository(process.env.ORBIT_DB_PATH,resolve('.')),app=createScheduler(repo),owner='local-owner';app.initialize(owner);const cloud=createPublicCloud(repo,owner,app);
console.log('Public booking bridge running. Only public time slots and booking decisions are synchronized.');await cloud.sync();process.on('SIGTERM',()=>{cloud.close();repo.close();process.exit();});setInterval(()=>{},60000);
