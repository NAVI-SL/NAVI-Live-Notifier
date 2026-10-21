import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';

// Host-local process ownership, independent of broker port/worktree and with no stale lock files.
export function gatewayLockPort(token: string) {
  const normalized = token.trim().replace(/^(Bot|Bearer)\s*/i, '');
  return 20000 + (createHash('sha256').update(normalized).digest().readUInt32BE(0) % 40000);
}
export function gatewayLockAddress(token: string) {
  if (process.platform !== 'win32') return gatewayLockPort(token);
  const normalized = token.trim().replace(/^(Bot|Bearer)\s*/i, '');
  return (
    '\\\\.\\pipe\\navi-discord-gateway-' + createHash('sha256').update(normalized).digest('hex')
  );
}
export async function acquireGatewayLease(
  token: string,
  waitMs = 5000,
  address: string | number = gatewayLockAddress(token),
) {
  const deadline = Date.now() + waitMs;
  for (;;) {
    const server = createServer((socket) => socket.destroy());
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(
          typeof address === 'string'
            ? { path: address, exclusive: true }
            : { host: '127.0.0.1', port: address, exclusive: true },
          () => {
            server.removeListener('error', reject);
            resolve();
          },
        );
      });
      let release: Promise<void> | undefined;
      return {
        release() {
          return (release ??= new Promise<void>((resolve, reject) =>
            server.close((error) =>
              error ? reject(new Error('Gateway ownership cleanup failed.')) : resolve(),
            ),
          ));
        },
      };
    } catch (error) {
      if (!(
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'EADDRINUSE' || (typeof address === 'string' && error.code === 'EACCES'))
      ))
        // eslint-disable-next-line preserve-caught-error -- Keep token-derived lock addresses out of diagnostics.
        throw new Error('Gateway ownership unavailable.');
      if (Date.now() >= deadline)
        // eslint-disable-next-line preserve-caught-error -- Keep token-derived lock addresses out of diagnostics.
        throw new Error('Another local process already owns the Gateway session.');
      await pause(100);
    }
  }
}
