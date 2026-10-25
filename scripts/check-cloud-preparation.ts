import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadRootEnvironment } from '@navi/config';
import { secretCandidates } from './lib/secret-candidates.ts';
function files(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(folder, entry.name)) : [join(folder, entry.name)],
  );
}
try {
  const preparation = files('deployment').filter((file) =>
    /\.(example|mjs|sql|conf|md)$/.test(file),
  );
  if (existsSync('docs/PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md'))
    preparation.push('docs/PHASE_15F_CLOUD_DEPLOYMENT_PLAN.md');
  const assets = files('apps/web/.next/static').filter((file) =>
    /\.(js|json|css|map|html)$/.test(file),
  );
  const secretKeys = [
    'BETTER_AUTH_SECRET',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_BOT_TOKEN',
    'BOT_INTERNAL_SECRET',
    'YOUTUBE_API_KEY',
    'KICK_CLIENT_SECRET',
    'MONITOR_WEBHOOK_SECRET',
    'DATABASE_URL',
    'REDIS_URL',
  ];
  const candidates = new Set<string>();
  for (const service of ['web', 'bot', 'worker'] as const) {
    const env = loadRootEnvironment(service);
    for (const key of secretKeys) {
      for (const value of secretCandidates(key, env[key])) candidates.add(value);
    }
  }
  const matchedFiles: string[] = [];
  for (const file of [...preparation, ...assets]) {
    const text = readFileSync(file, 'utf8');
    if (
      [...candidates].some((value) => text.includes(value)) ||
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)
    )
      matchedFiles.push(file);
  }
  const blueprint = readFileSync('deployment/render/dashboard.yaml.example', 'utf8');
  const ignore = readFileSync('.dockerignore', 'utf8');
  const checks = {
    no_known_secret_matches: matchedFiles.length === 0,
    web_has_no_bot_broker_secret:
      !blueprint.includes('key: BOT_INTERNAL_SECRET') &&
      !blueprint.includes('key: DISCORD_BOT_TOKEN'),
    render_prestart_validation: blueprint.includes('deployment/render/check-web.mjs'),
    default_consumer_disabled: readFileSync('deployment/render/bot.env.example', 'utf8').includes(
      'BOT_COMMANDS_ENABLED=false',
    ),
    monitoring_template_disabled: readFileSync(
      'deployment/render/worker.env.example',
      'utf8',
    ).includes('MONITORING_ENABLED=false'),
    docker_excludes_real_env_and_local:
      ignore.split(/\r?\n/).includes('.env') &&
      ignore.split(/\r?\n/).includes('.local') &&
      ignore.includes('**/*.env'),
  };
  console.info(
    JSON.stringify({
      event: 'cloud_preparation',
      checks,
      ready: Object.values(checks).every(Boolean),
      preparationFiles: preparation.length,
      clientAssets: assets.length,
      candidateValues: candidates.size,
      matchedFiles: matchedFiles.length,
      liveVerification: false,
    }),
  );
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
} catch {
  console.error(
    JSON.stringify({
      event: 'cloud_preparation',
      ready: false,
      code: 'build_assets_and_review_preparation_files',
      liveVerification: false,
    }),
  );
  process.exitCode = 1;
}
