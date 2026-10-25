import { readFileSync } from 'node:fs';
/** Test-only renderer of the reviewed SQL body; never invokes psql or applies grants itself. */
export function commandGrantSql(database: string, web: string, bot: string) {
  const identifiers = [database, web, bot];
  if (
    !identifiers.every((value) => /^[a-z_][a-z0-9_]{0,62}$/.test(value)) ||
    web === bot ||
    [web, bot].some((value) => value.startsWith('pg_') || value === 'postgres')
  )
    throw new Error('Invalid isolated grant identifiers.');
  const source = readFileSync('deployment/command-permissions.sql', 'utf8');
  const body = source
    .split('-- BEGIN NAVI COMMAND GRANTS')[1]
    ?.split('-- END NAVI COMMAND GRANTS')[0];
  if (!body) throw new Error('Command grant body unavailable.');
  return body
    .replaceAll(':"navi_target_database"', `"${database}"`)
    .replaceAll(':"web_role"', `"${web}"`)
    .replaceAll(':"bot_command_role"', `"${bot}"`)
    .replaceAll(":'web_role'", `'${web}'`)
    .replaceAll(":'bot_command_role'", `'${bot}'`);
}
