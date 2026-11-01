import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const publicState=sqliteTable('public_state',{id:text('id').primaryKey(),data:text('data').notNull(),updatedAt:integer('updated_at').notNull()});
export const requests=sqliteTable('booking_requests',{id:text('id').primaryKey(),retryHash:text('retry_hash').notNull().unique(),bodyHash:text('body_hash').notNull(),capabilityHash:text('capability_hash').notNull(),status:text('status').notNull(),payload:text('payload').notNull(),expiresAt:integer('expires_at').notNull(),localVersion:integer('local_version').notNull().default(0)});
export const limits=sqliteTable('rate_limits',{id:text('id').primaryKey(),hits:integer('hits').notNull(),expiresAt:integer('expires_at').notNull()});
export const ownerRelay=sqliteTable('owner_relay',{id:text('id').primaryKey(),state:text('state').notNull(),payload:text('payload').notNull(),response:text('response'),expiresAt:integer('expires_at').notNull()});
