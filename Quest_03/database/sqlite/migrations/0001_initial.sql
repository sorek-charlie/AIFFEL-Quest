CREATE TABLE owners(id TEXT PRIMARY KEY, settings TEXT NOT NULL);
CREATE TABLE entities(owner_id TEXT NOT NULL REFERENCES owners(id),kind TEXT NOT NULL CHECK(kind IN ('task','event','booking')),id TEXT NOT NULL, data TEXT NOT NULL,PRIMARY KEY(owner_id,kind,id));
CREATE TABLE audit_events(id INTEGER PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES owners(id),entity_id TEXT NOT NULL,action TEXT NOT NULL,at INTEGER NOT NULL);
CREATE TABLE idempotency(scope TEXT NOT NULL,key_hash TEXT NOT NULL,body_hash TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(scope,key_hash));
