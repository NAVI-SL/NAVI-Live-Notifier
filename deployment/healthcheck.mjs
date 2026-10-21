/* global fetch, AbortSignal */
import { loadRootEnvironment } from '@navi/config';
import { createDatabase } from '@navi/database';
let database;
try {
  const service = process.argv[2];
  if (!['web', 'bot', 'worker'].includes(service)) throw new Error();
  const env = loadRootEnvironment(service);
  const port =
    service === 'web'
      ? 3000
      : service === 'bot'
        ? env.BOT_STATUS_PORT || 4001
        : env.MONITOR_PORT || 4100;
  const path = service === 'web' ? '/api/health' : '/internal/health';
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    headers: service === 'web' ? {} : { authorization: `Bearer ${env.BOT_INTERNAL_SECRET}` },
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.json();
  if (!response.ok || body.status !== (service === 'web' ? 'initialized' : 'ok')) throw new Error();
  if (service === 'web') {
    database = createDatabase(env.DATABASE_URL);
    // The public route stays liveness-only; the private container probe also verifies auth schema access.
    await database.pool.query('SELECT id FROM auth_user LIMIT 0');
  }
} catch {
  process.exitCode = 1; // Probe output must not leak internal credentials or response bodies.
} finally {
  await database?.close();
}
