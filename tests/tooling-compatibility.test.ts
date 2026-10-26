import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);
function removeScratch(folder: string) {
  const target = resolve(folder);
  if (
    !target.startsWith(resolve(tmpdir()) + sep) ||
    !basename(target).startsWith('navi-tooling-regression-')
  )
    throw new Error('Refusing to remove an unexpected scratch directory.');
  rmSync(target, { recursive: true, force: true });
}
const toolingRequire = createRequire(require.resolve('@esbuild-kit/core-utils'));
const loader = require('@esbuild-kit/core-utils') as {
  transformSync(code: string, file: string): { code: string; map: unknown };
  transform(code: string, file: string): Promise<{ code: string; map: unknown }>;
};

it('resolves a patched transformer through the actual legacy loader and contains no affected lock entries', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const installed = toolingRequire('esbuild') as { version: string };
  expect(installed.version).toBe(manifest.overrides['@esbuild-kit/core-utils'].esbuild);
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
    packages: Record<string, { version?: string }>;
  };
  const versions = Object.entries(lock.packages)
    .filter(([path]) => path.endsWith('/esbuild'))
    .map(([, entry]) => entry.version!);
  expect(versions.length).toBeGreaterThan(0);
  for (const version of versions) {
    const [major, minor] = version.split('.').map(Number);
    expect(major! > 0 || minor! >= 25).toBe(true);
  }
});

it('retains executable CJS and ESM TypeScript transforms and source maps after the security override', async () => {
  const source = 'export const answer: number = 40 + 2;';
  const commonjs = loader.transformSync(source, join(tmpdir(), 'navi-tooling-fixture.cts'));
  const module = { exports: {} as { answer?: number } };
  runInNewContext(commonjs.code, { module, exports: module.exports });
  expect(module.exports.answer).toBe(42);
  expect(commonjs.map).toBeDefined();
  const esm = await loader.transform(source, join(tmpdir(), 'navi-tooling-fixture.mts'));
  const evaluated = await import(
    `data:text/javascript;base64,${Buffer.from(esm.code).toString('base64')}`
  );
  expect(evaluated.answer).toBe(42);
  expect(esm.map).toBeDefined();
});

it('loads a typed Drizzle config, generates and checks scratch SQL, and applies that SQL without touching application migrations', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'navi-tooling-regression-'));
  const database = new PGlite();
  try {
    await database.waitReady;
    const schemaPath = join(folder, 'schema.ts');
    const output = join(folder, 'migrations');
    const config = join(folder, 'drizzle.config.ts');
    writeFileSync(
      schemaPath,
      `import { pgTable, integer, text } from ${JSON.stringify(require.resolve('drizzle-orm/pg-core'))};
       export const fixture = pgTable('tooling_fixture', {
         id: integer('id').primaryKey(), label: text('label').notNull()
       });`,
    );
    writeFileSync(
      config,
      `const dialect: string = 'postgresql';
       export default { dialect, schema: './schema.ts', out: './migrations' };`,
    );
    const workspaceRequire = createRequire(
      new URL('../packages/database/package.json', import.meta.url),
    );
    const cli = join(dirname(workspaceRequire.resolve('drizzle-kit')), 'bin.cjs');
    for (const action of ['generate', 'check']) {
      const result = spawnSync(process.execPath, [cli, action, `--config=${config}`], {
        cwd: folder,
        // Never inherit application credentials or an alternate environment file.
        env: { NODE_ENV: 'test', SystemRoot: process.env.SystemRoot, PATH: process.env.PATH },
        encoding: 'utf8',
        timeout: 20000,
      });
      expect(
        result.status,
        `${action}: ${result.error?.message ?? ''} ${result.stdout} ${result.stderr}`,
      ).toBe(0);
    }
    const migrations = readdirSync(output).filter((name) => name.endsWith('.sql'));
    expect(migrations).toHaveLength(1);
    await database.exec(readFileSync(join(output, migrations[0]!), 'utf8'));
    await database.exec("INSERT INTO tooling_fixture (id,label) VALUES (1,'synthetic');");
    const { rows } = await database.query('SELECT id,label FROM tooling_fixture');
    expect(rows).toEqual([{ id: 1, label: 'synthetic' }]);
  } finally {
    await database.close();
    removeScratch(folder);
  }
}, 45000);
