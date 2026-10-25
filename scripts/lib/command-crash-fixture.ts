import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabase, createCommandRepository } from '@navi/database';
// Dedicated child fixture: no Gateway, HTTP broker, provider or sender is imported.
assert.equal(process.env.NAVI_PHASE15E_CHILD, 'true');
const url = new URL(process.env.DATABASE_URL ?? '');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
assert(/^\/navi_phase15e_[a-f0-9]{32}$/.test(url.pathname));
const database = createDatabase(url.toString());
const repository = createCommandRepository(database.db, {
  allowedUsers: ['333333333333333333'],
  allowedGuilds: ['111111111111111111', '222222222222222222'],
});
const row = await repository.claim(randomUUID());
assert(row);
if (process.env.NAVI_PHASE15E_EFFECT === 'true') await repository.markEffect(row);
process.send?.({ claimed: true, id: row.id });
// Parent terminates only this owned process to exercise a real crash.
setInterval(() => {}, 1000);
