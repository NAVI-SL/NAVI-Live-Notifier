import { loadRootEnvironment, readDatabaseEnvironment } from '@navi/config';
import { createDatabase, createStreamerRepository, createNotificationRepository } from './index.js';
const environment = readDatabaseEnvironment(loadRootEnvironment('database'));
const database = createDatabase(environment.DATABASE_URL);
try {
  await createStreamerRepository(database.db).prune();
  await createNotificationRepository(database.db).pruneTests();
  console.info(
    'Expired channel registrations pruned. No provider requests or notifications were sent.',
  );
} catch {
  console.error('Registration pruning failed. Check PostgreSQL and applied migrations.');
  process.exitCode = 1;
} finally {
  await database.close();
}
