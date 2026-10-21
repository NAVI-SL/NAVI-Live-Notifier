import { loadRootEnvironment, readDatabaseEnvironment } from '@navi/config';
import { createDatabase } from './index.js';

const environment = readDatabaseEnvironment(loadRootEnvironment('database'));
const database = createDatabase(environment.DATABASE_URL);
try {
  await database.pool.query('SELECT 1 AS ok');
  console.info('PostgreSQL connection check passed.');
} catch {
  console.error('PostgreSQL connection check failed. Check the service and DATABASE_URL.');
  process.exitCode = 1;
} finally {
  await database.close();
}
