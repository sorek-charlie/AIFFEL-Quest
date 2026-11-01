import {createApp} from '../apps/api/src/bootstrap/server.mjs';
// Uses the existing encrypted PC database; no launch/setup token is published.
const {server}=createApp({dbPath:process.env.ORBIT_DB_PATH});
server.listen(0,'127.0.0.1',()=>console.log('Owner terminal connected to the hosted backend. Keep this process running.'));
process.on('SIGTERM',()=>server.close());
