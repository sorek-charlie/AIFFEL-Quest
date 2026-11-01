import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { dirname } from 'node:path';
export function createRepository(path, root) {
  mkdirSync(dirname(path),{recursive:true});
  const keyPath=path+'.key';
  if(!existsSync(keyPath)) writeFileSync(keyPath,randomBytes(32),{mode:0o600,flag:'wx'});
  const key=readFileSync(keyPath);
  function seal(value) { const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([c.update(value,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),data]).toString('base64'); }
  function open(value) { const b=Buffer.from(value,'base64'),c=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return Buffer.concat([c.update(b.subarray(28)),c.final()]).toString('utf8'); }
  const db=new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  for(const name of readdirSync(`${root}/database/sqlite/migrations`).filter(n=>/^\d+.*\.sql$/.test(n)).sort()) {
    const version=Number(name.split('_')[0]);
    if(db.prepare('PRAGMA user_version').get().user_version>=version)continue;
    db.exec('BEGIN IMMEDIATE');
    try { db.exec(readFileSync(`${root}/database/sqlite/migrations/${name}`,'utf8')); db.exec(`PRAGMA user_version=${version}; COMMIT`); } catch(e) { db.exec('ROLLBACK'); throw e; }
  }
  return {
    close:()=>db.close(),
    password(owner) {return db.prepare('SELECT salt,hash FROM passwords WHERE owner_id=?').get(owner);},
    savePassword(owner,salt,hash) {db.prepare('INSERT INTO passwords VALUES(?,?,?) ON CONFLICT(owner_id) DO UPDATE SET salt=excluded.salt,hash=excluded.hash').run(owner,salt,hash);},
    config(owner,name) {const r=db.prepare('SELECT value FROM private_config WHERE owner_id=? AND name=?').get(owner,name);return r?JSON.parse(open(r.value)):null;},
    saveConfig(owner,name,value) {db.prepare('INSERT INTO private_config VALUES(?,?,?) ON CONFLICT(owner_id,name) DO UPDATE SET value=excluded.value').run(owner,name,seal(JSON.stringify(value)));},
    proposals(owner) {return db.prepare('SELECT data FROM input_proposals WHERE owner_id=? ORDER BY rowid DESC').all(owner).map(r=>JSON.parse(r.data));},
    proposal(owner,id) {const r=db.prepare('SELECT data FROM input_proposals WHERE owner_id=? AND id=?').get(owner,id);return r?JSON.parse(r.data):null;},
    saveProposal(owner,p) {db.prepare('INSERT INTO input_proposals VALUES(?,?,?,?) ON CONFLICT(owner_id,source_key) DO NOTHING').run(owner,p.id,p.sourceKey,JSON.stringify(p));},
    updateProposal(owner,p) {db.prepare('UPDATE input_proposals SET data=? WHERE owner_id=? AND id=?').run(JSON.stringify(p),owner,p.id);},
    transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch(e) { db.exec('ROLLBACK'); throw e; } },
    getOwner(id) { const row=db.prepare('SELECT settings FROM owners WHERE id=?').get(id); return row?JSON.parse(row.settings):null; },
    saveOwner(id,s) { db.prepare('INSERT INTO owners VALUES(?,?) ON CONFLICT(id) DO UPDATE SET settings=excluded.settings').run(id,JSON.stringify(s)); },
    list(owner,kind) { return (kind==='project'?db.prepare('SELECT data FROM projects WHERE owner_id=?').all(owner):db.prepare('SELECT data FROM entities WHERE owner_id=? AND kind=?').all(owner,kind)).map(r=>JSON.parse(r.data)); },
    get(owner,kind,id) { const row=kind==='project'?db.prepare('SELECT data FROM projects WHERE owner_id=? AND id=?').get(owner,id):db.prepare('SELECT data FROM entities WHERE owner_id=? AND kind=? AND id=?').get(owner,kind,id); return row?JSON.parse(row.data):null; },
    save(owner,kind,e) { if(kind==='project')db.prepare('INSERT INTO projects VALUES(?,?,?) ON CONFLICT(owner_id,id) DO UPDATE SET data=excluded.data').run(owner,e.id,JSON.stringify(e));else db.prepare('INSERT INTO entities VALUES(?,?,?,?) ON CONFLICT(owner_id,kind,id) DO UPDATE SET data=excluded.data').run(owner,kind,e.id,JSON.stringify(e)); },
    remove(owner,kind,id) {if(kind==='project')db.prepare('DELETE FROM projects WHERE owner_id=? AND id=?').run(owner,id);else db.prepare('DELETE FROM entities WHERE owner_id=? AND kind=? AND id=?').run(owner,kind,id); },
    audit(owner,id,action,now) { db.prepare('INSERT INTO audit_events(owner_id,entity_id,action,at) VALUES(?,?,?,?)').run(owner,id,action,now); },
    replay(scope,key) { const row=db.prepare('SELECT body_hash,result FROM idempotency WHERE scope=? AND key_hash=?').get(scope,key); return row?{body_hash:row.body_hash,result:open(row.result)}:null; },
    remember(scope,key,hash,result) { db.prepare('INSERT INTO idempotency VALUES(?,?,?,?)').run(scope,key,hash,seal(JSON.stringify(result))); }
  };
}
