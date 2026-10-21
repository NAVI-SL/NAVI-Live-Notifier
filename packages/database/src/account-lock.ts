import type pg from 'pg';
import { setTimeout as pause } from 'node:timers/promises';

export class CoordinationBusyError extends Error {
  constructor() {
    super('Authentication is busy. Try again.');
  }
}

/** Separate pool: waiting for a refresh lock must not exhaust the auth query pool. */
export async function withAccountLock<T>(
  pool: pg.Pool,
  accountId: string,
  operation: (assertHeld: () => void) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let locked = false;
  let discard = false;
  let connectionLost = false;
  const onConnectionError = () => {
    connectionLost = true;
    discard = true;
  };
  client.on('error', onConnectionError);
  const key = `navi:discord-account:${accountId}`;
  try {
    const deadline = Date.now() + 5_000;
    do {
      const result = await client.query<{ acquired: boolean }>({
        text: 'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired',
        values: [key],
      });
      locked = result.rows[0]?.acquired === true;
      if (locked) {
        const assertHeld = () => {
          if (connectionLost)
            throw new Error('Authentication coordination interrupted. Try again.');
        };
        assertHeld();
        const result = await operation(assertHeld);
        if (connectionLost) throw new Error('Authentication coordination interrupted. Try again.');
        return result;
      }
      if (Date.now() >= deadline) throw new CoordinationBusyError();
      await pause(50);
    } while (!locked);
    throw new Error('Unable to coordinate authentication.');
  } finally {
    if (locked && !connectionLost) {
      try {
        await client.query({
          text: 'SELECT pg_advisory_unlock(hashtextextended($1, 0))',
          values: [key],
        });
      } catch {
        discard = true;
      }
    } else {
      discard = true;
    }
    client.release(discard);
    client.off('error', onConnectionError);
  }
}
