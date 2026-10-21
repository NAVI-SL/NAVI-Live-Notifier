import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRootEnvironment } from '@navi/config';

// Never print matches, file contents, tokens or connection strings.
const values = ['web', 'bot', 'worker'].flatMap((service) =>
  Object.entries(loadRootEnvironment(service as 'web' | 'bot' | 'worker')).filter(
    ([key, value]) =>
      /SECRET|TOKEN|API_KEY|DATABASE_URL/.test(key) &&
      typeof value === 'string' &&
      value.length >= 12,
  ),
);
let scanned = 0;
const found = new Set<string>();
function scan(folder: string) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) scan(path);
    else {
      const text = readFileSync(path, 'utf8');
      scanned++;
      for (const [key, value] of values) if (value && text.includes(value)) found.add(key);
    }
  }
}
try {
  scan('apps/web/.next/static');
  console.info(
    JSON.stringify({
      check: 'client_secret_values',
      scanned,
      configuredCandidates: values.length,
      leakedFields: [...found],
    }),
  );
  if (found.size) process.exitCode = 1;
} catch {
  console.error('FAIL: client asset check unavailable; build first.');
  process.exitCode = 1;
}
