import { createDatabase } from '@navi/database';
import { loadRootEnvironment, readDatabaseEnvironment } from '@navi/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
let database;
try {
  const env = readDatabaseEnvironment(loadRootEnvironment('database'));
  database = createDatabase(env.DATABASE_URL);
  await database.withAccountLock('production-migration', async () => {
    await migrate(database.db, { migrationsFolder: '/app/packages/database/migrations' });
  });
  console.info(JSON.stringify({ service: 'migration', event: 'completed' }));
} catch {
  console.error(
    JSON.stringify({ service: 'migration', event: 'failed_review_schema_and_connectivity' }),
  );
  process.exitCode = 1;
} finally {
  await database?.close();
}
