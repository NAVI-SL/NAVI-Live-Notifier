import { loadRootEnvironment } from '@navi/config';
import { releaseConfiguration } from './lib/release-configuration.ts';

// Read-only admission preflight. Success is configuration consistency, never release approval.
try {
  const result = releaseConfiguration({
    web: loadRootEnvironment('web'),
    bot: loadRootEnvironment('bot'),
    worker: loadRootEnvironment('worker'),
  });
  console.info(JSON.stringify({ event: 'release_configuration', ...result }));
  if (!result.ready) process.exitCode = 1;
} catch {
  console.error(
    JSON.stringify({
      event: 'release_configuration',
      ready: false,
      code: 'check_service_configuration',
      liveVerification: false,
    }),
  );
  process.exitCode = 1;
}
