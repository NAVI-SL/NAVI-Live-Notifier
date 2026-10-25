import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readDatabaseEnvironment } from '@navi/config';
import * as schema from './schema.js';
import { withAccountLock } from './account-lock.js';
export { withAccountLock, CoordinationBusyError } from './account-lock.js';
export { schema };
export * from './streamers.js';
export * from './notifications.js';
export * from './monitoring.js';
export * from './bot-commands.js';
export * from './command-readiness.js';

/** Lazy factory: importing the package never connects or modifies the database. */
export function createDatabase(connectionString: string) {
  const { DATABASE_URL } = readDatabaseEnvironment({ DATABASE_URL: connectionString });
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });
  const lockPool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    query_timeout: 1_000,
  });
  for (const connectionPool of [pool, lockPool]) {
    connectionPool.on('error', () =>
      console.error('PostgreSQL idle connection lost. A new connection will be used.'),
    );
  }
  return {
    db: drizzle(pool, { schema }),
    pool,
    withAccountLock: <T>(id: string, operation: (assertHeld: () => void) => Promise<T>) =>
      withAccountLock(lockPool, id, operation),
    close: async () => {
      await Promise.all([pool.end(), lockPool.end()]);
    },
  };
}
