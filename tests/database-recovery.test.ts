import { describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { withAccountLock } from '@navi/database';
import type pg from 'pg';

describe('database recovery boundaries', () => {
  it('survives an idle pool error in a child process without leaking its input', () => {
    const child = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import { createDatabase } from '@navi/database';
      const db = createDatabase('postgresql://127.0.0.1:1/test');
      db.pool.emit('error', new Error('FAKE_DATABASE_SECRET'));
      await db.close(); console.log('survived');
    `,
      ],
      { encoding: 'utf8', timeout: 10_000 },
    );
    expect(child.status).toBe(0);
    expect(child.stdout).toContain('survived');
    expect(child.stderr).toContain('PostgreSQL idle connection lost');
    expect(child.stderr).not.toContain('FAKE_DATABASE_SECRET');
  });
  it('unlocks and releases the dedicated connection after an operation fails', async () => {
    const query = vi
      .fn<(config: unknown) => Promise<{ rows: { acquired: boolean }[] }>>()
      .mockResolvedValue({ rows: [{ acquired: true }] });
    const release = vi.fn();
    const pool = {
      connect: async () => ({ query, release, on: () => {}, off: () => {} }),
    } as unknown as pg.Pool;
    await expect(
      withAccountLock(pool, 'account', async () => {
        throw new Error('operation failed');
      }),
    ).rejects.toThrow('operation failed');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[0]).toMatchObject({
      text: expect.stringContaining('pg_advisory_unlock'),
    });
    expect(release).toHaveBeenCalledWith(false);
  });
  it('discards a connection when releasing the advisory lock fails', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockRejectedValueOnce(new Error('disconnected'));
    const release = vi.fn();
    const pool = {
      connect: async () => ({ query, release, on: () => {}, off: () => {} }),
    } as unknown as pg.Pool;
    expect(await withAccountLock(pool, 'account', async () => 'ok')).toBe('ok');
    expect(release).toHaveBeenCalledWith(true);
  });
  it('fails closed and discards the connection if the checked-out lock connection is lost', async () => {
    let onError = () => {};
    const query = vi.fn(async () => ({ rows: [{ acquired: true }] }));
    const release = vi.fn();
    const pool = {
      connect: async () => ({
        query,
        release,
        on: (_event: string, handler: () => void) => {
          onError = handler;
        },
        off: () => {},
      }),
    } as unknown as pg.Pool;
    await expect(
      withAccountLock(pool, 'account', async () => {
        onError();
        return 'unsafe';
      }),
    ).rejects.toThrow('coordination interrupted');
    expect(query).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(true);
  });
});
