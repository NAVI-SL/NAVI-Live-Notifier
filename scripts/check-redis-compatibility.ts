import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createConnection } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadRootEnvironment } from '@navi/config';

// Small RESP2 validation probe, not an application Redis client or queue implementation.
function localRedisUrl() {
  try {
    return new URL(loadRootEnvironment('worker').REDIS_URL ?? 'redis://127.0.0.1:6379');
  } catch {
    throw new Error('Invalid local Redis probe configuration; sensitive input suppressed.');
  }
}
const url = localRedisUrl();
assert.equal(
  url.protocol,
  'redis:',
  'Local TCP probe only; Upstash TLS requires separate approval.',
);
assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
type Reply = string | number | null | Reply[];
function parse(buffer: Buffer, offset = 0): { value: Reply; end: number } | undefined {
  const end = buffer.indexOf('\r\n', offset);
  if (end < 0) return;
  const prefix = String.fromCharCode(buffer[offset]!),
    body = buffer.toString('utf8', offset + 1, end),
    next = end + 2;
  if (prefix === '+') return { value: body, end: next };
  if (prefix === '-') throw new Error('Redis rejected a local probe command.');
  if (prefix === ':') return { value: Number(body), end: next };
  if (prefix === '$') {
    const size = Number(body);
    if (size === -1) return { value: null, end: next };
    if (buffer.length < next + size + 2) return;
    return { value: buffer.toString('utf8', next, next + size), end: next + size + 2 };
  }
  if (prefix === '*') {
    const count = Number(body);
    if (count === -1) return { value: null, end: next };
    let cursor = next;
    const values: Reply[] = [];
    for (let index = 0; index < count; index++) {
      const item = parse(buffer, cursor);
      if (!item) return;
      values.push(item.value);
      cursor = item.end;
    }
    return { value: values, end: cursor };
  }
  throw new Error('Invalid Redis probe response.');
}
async function connect() {
  const socket = createConnection({ host: url.hostname, port: Number(url.port || 6379) });
  socket.setTimeout(5000, () => socket.destroy(new Error('Local Redis probe timeout.')));
  let buffer = Buffer.alloc(0);
  const replies: Reply[] = [],
    waiting: { resolve: (value: Reply) => void; reject: (error: Error) => void }[] = [];
  socket.on('error', () => {
    for (const waiter of waiting.splice(0))
      waiter.reject(new Error('Local Redis connection unavailable.'));
  });
  socket.on('data', (chunk) => {
    try {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const item = parse(buffer);
        if (!item) break;
        buffer = buffer.subarray(item.end);
        const waiter = waiting.shift();
        if (waiter) waiter.resolve(item.value);
        else replies.push(item.value);
      }
    } catch {
      socket.destroy(new Error('Invalid Redis probe response.'));
    }
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  const next = () =>
    replies.length
      ? Promise.resolve(replies.shift()!)
      : new Promise<Reply>((resolve, reject) => waiting.push({ resolve, reject }));
  const command = (...args: string[]) => {
    socket.write(
      `*${args.length}\r\n` +
        args.map((value) => `$${Buffer.byteLength(value)}\r\n${value}\r\n`).join(''),
    );
    return next();
  };
  const client = { command, next, close: () => socket.destroy() };
  if (url.password)
    await command(
      'AUTH',
      ...(url.username ? [decodeURIComponent(url.username)] : []),
      decodeURIComponent(url.password),
    );
  return client;
}
const prefix = `navi:phase15e:${randomUUID()}`,
  keys = [`${prefix}:cache`, `${prefix}:queue`];
let publisher: Awaited<ReturnType<typeof connect>> | undefined,
  subscriber: Awaited<ReturnType<typeof connect>> | undefined;
const results: { scenario: string; status: 'PASS' }[] = [];
try {
  publisher = await connect();
  subscriber = await connect();
  assert.equal(await publisher.command('PING'), 'PONG');
  results.push({ scenario: 'Native TCP/RESP2 connection and PING', status: 'PASS' });
  assert.equal(await publisher.command('SET', keys[0]!, 'synthetic', 'NX', 'EX', '30'), 'OK');
  assert.equal(await publisher.command('SET', keys[0]!, 'other', 'NX', 'EX', '30'), null);
  assert.equal(await publisher.command('GET', keys[0]!), 'synthetic');
  assert(Number(await publisher.command('TTL', keys[0]!)) > 0);
  results.push({ scenario: 'Cache SET NX EX, GET and bounded TTL', status: 'PASS' });
  assert.equal(await publisher.command('MULTI'), 'OK');
  assert.equal(await publisher.command('GET', keys[0]!), 'QUEUED');
  assert.deepEqual(await publisher.command('EXEC'), ['synthetic']);
  results.push({ scenario: 'MULTI/EXEC transaction compatibility', status: 'PASS' });
  assert.deepEqual(await subscriber.command('SUBSCRIBE', prefix), ['subscribe', prefix, 1]);
  const incoming = subscriber.next();
  assert.equal(await publisher.command('PUBLISH', prefix, 'synthetic-event'), 1);
  assert.deepEqual(await incoming, ['message', prefix, 'synthetic-event']);
  results.push({ scenario: 'Native Pub/Sub across independent connections', status: 'PASS' });
  assert.equal(await publisher.command('LPUSH', keys[1]!, 'synthetic-job'), 1);
  await publisher.command('EXPIRE', keys[1]!, '30');
  assert.deepEqual(await publisher.command('BRPOP', keys[1]!, '1'), [keys[1]!, 'synthetic-job']);
  results.push({ scenario: 'List queue LPUSH/BRPOP with pre-existing test item', status: 'PASS' });
  for (const result of results) console.info(`PASS: ${result.scenario}`);
} catch {
  console.error(
    'FAIL: local Redis compatibility probe; secret-bearing connection errors suppressed.',
  );
  process.exitCode = 1;
} finally {
  if (publisher) {
    try {
      await publisher.command('DEL', ...keys);
    } catch {
      process.exitCode = 1;
    }
  }
  publisher?.close();
  subscriber?.close();
  mkdirSync('.local/phase15e', { recursive: true });
  writeFileSync(
    '.local/phase15e/redis-results.json',
    JSON.stringify(
      {
        date: '2026-10-25',
        exitCode: process.exitCode ?? 0,
        results,
        boundary:
          'Local Redis TCP only. No Upstash connection, TLS endpoint, REST API or application Redis queue is verified.',
      },
      null,
      2,
    ),
  );
}
