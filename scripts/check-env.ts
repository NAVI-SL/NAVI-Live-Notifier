import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import {
  loadRootEnvironment,
  readBotEnvironment,
  readDatabaseEnvironment,
  readWebEnvironment,
  readWorkerEnvironment,
  readAuthEnvironment,
} from '@navi/config';

try {
  const exampleMode = process.argv.includes('--example');
  const example = exampleMode
    ? parse(readFileSync(new URL('../.env.example', import.meta.url)))
    : undefined;
  const web = example ?? loadRootEnvironment('web');
  readWebEnvironment(web);
  readBotEnvironment(example ?? loadRootEnvironment('bot'));
  readWorkerEnvironment(example ?? loadRootEnvironment('worker'));
  readDatabaseEnvironment(example ?? loadRootEnvironment('database'));
  if (process.argv.includes('--auth')) readAuthEnvironment(web);
  console.info('Environment configuration is valid. No services were contacted.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Environment validation failed.');
  process.exitCode = 1;
}
