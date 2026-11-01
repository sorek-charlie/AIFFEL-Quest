CREATE TABLE passwords(owner_id TEXT PRIMARY KEY REFERENCES owners(id), salt TEXT NOT NULL, hash TEXT NOT NULL);
CREATE TABLE private_config(owner_id TEXT NOT NULL REFERENCES owners(id), name TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner_id,name));
CREATE TABLE input_proposals(owner_id TEXT NOT NULL REFERENCES owners(id), id TEXT NOT NULL, source_key TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(owner_id,id), UNIQUE(owner_id,source_key));
