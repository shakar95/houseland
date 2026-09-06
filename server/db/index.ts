import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[DB] Warning: DATABASE_URL is not set.');
}

const globalForDb = globalThis as unknown as {
  queryClient?: postgres.Sql;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

// Supabase session/transaction pooler works best with prepare: false and a reasonable connection cap
export const queryClient =
  globalForDb.queryClient ??
  postgres(connectionString || '', {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 30,
    prepare: false, // Essential for Supabase PgBouncer pooler
  });

export const db =
  globalForDb.db ??
  drizzle(queryClient, {
    schema,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.queryClient = queryClient;
  globalForDb.db = db;
}

export * from './schema.js';
