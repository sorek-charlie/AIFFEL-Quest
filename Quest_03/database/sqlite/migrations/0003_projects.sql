CREATE TABLE projects(owner_id TEXT NOT NULL REFERENCES owners(id), id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(owner_id,id));
