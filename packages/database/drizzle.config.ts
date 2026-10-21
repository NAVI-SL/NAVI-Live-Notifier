import { defineConfig } from 'drizzle-kit';
import { loadRootEnvironment, readDatabaseEnvironment } from '@navi/config';

const { DATABASE_URL } = readDatabaseEnvironment(loadRootEnvironment('database'));

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url: DATABASE_URL },
  strict: true,
});
