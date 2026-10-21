import { createPublicKey } from 'node:crypto';
import { loadRootEnvironment, readMonitoringEnvironment } from '@navi/config';
import { createMonitoringProviders, ProviderError } from '../apps/worker/src/providers';
// Explicit read-only connectivity command; never starts polling, subscribes or sends.
const environment = readMonitoringEnvironment(loadRootEnvironment('worker'));
console.info('Monitoring configuration is valid. No secret values printed.');
if (process.argv.includes('--connectivity')) {
  const providers = createMonitoringProviders(environment, {
    reserve: async () => true,
    block: async () => {},
  });
  try {
    const key = await providers.publicKey();
    if (createPublicKey(key).asymmetricKeyType !== 'rsa') throw new Error('invalid_key');
    console.info('PASS: official Kick public-key endpoint and RSA key format (unauthenticated).');
  } catch {
    console.error('FAIL: Kick public-key connectivity.');
    process.exitCode = 1;
  }
  if (environment.YOUTUBE_API_KEY) {
    try {
      await providers.youtube('channels', { part: 'id', id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' });
      console.info(
        'PASS: authenticated YouTube channels API connectivity; no livestream verified.',
      );
    } catch (error) {
      console.error(
        `FAIL: YouTube connectivity (${error instanceof ProviderError ? error.code : 'unavailable'}).`,
      );
      process.exitCode = 1;
    }
  } else console.info('SKIP: authenticated YouTube API; worker API key is absent.');
  if (environment.KICK_CLIENT_ID && environment.KICK_CLIENT_SECRET) {
    try {
      await providers.kick('events/subscriptions');
      console.info(
        'PASS: Kick app token and read-only subscription inventory; no livestream verified.',
      );
    } catch (error) {
      console.error(
        `FAIL: Kick authenticated connectivity (${error instanceof ProviderError ? error.code : 'unavailable'}).`,
      );
      process.exitCode = 1;
    }
  } else console.info('SKIP: authenticated Kick API; worker app credentials are absent.');
}
