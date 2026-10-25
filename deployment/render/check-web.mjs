import { loadRootEnvironment, readAuthEnvironment } from '@navi/config';
// Validate before starting Next. Merely importing a Blueprint is NOT authorization to deploy.
try {
  const env = readAuthEnvironment(loadRootEnvironment('web'));
  const port = Number(process.env.PORT);
  if (
    env.NODE_ENV !== 'production' ||
    env.BOT_COMMAND_TRANSPORT !== 'postgres' ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    process.env.DISCORD_BOT_TOKEN
  )
    throw new Error();
  console.info(
    JSON.stringify({
      event: 'render_web_configuration',
      valid: true,
      transport: 'postgres',
      readinessVerified: false,
    }),
  );
} catch {
  console.error(
    JSON.stringify({
      event: 'render_web_configuration',
      valid: false,
      code: 'check_scoped_production_postgres_environment_and_port',
    }),
  );
  process.exitCode = 1;
}
