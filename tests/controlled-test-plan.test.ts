import { expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  controlledTestPlan,
  readTestScope,
  type TestRoute,
  type TestDelivery,
} from '../scripts/lib/controlled-test-plan';
import { isPublicHttpsOrigin } from '../scripts/lib/release-origin';

const scope = {
  guildId: '111111111111111111',
  notBefore: '2026-10-22T12:00:00.000Z',
  destinations: [
    { provider: 'youtube' as const, sourceId: 'source-y', channelId: '222222222222222222' },
    { provider: 'kick' as const, sourceId: 'source-k', channelId: '333333333333333333' },
  ],
};
const routes: TestRoute[] = scope.destinations.map((d, i) => ({
  ...d,
  subscriptionId: `subscription-${i}`,
  guildId: scope.guildId,
  enabled: true,
  notificationsEnabled: true,
  roleId: null,
  mentionEveryone: false,
}));
const delivery = (status: string, startedAt: string): TestDelivery => ({
  sourceId: 'source-y',
  guildId: scope.guildId,
  channelId: scope.destinations[0]!.channelId,
  status,
  startedAt,
});

it.each([
  'https://127.0.0.2',
  'https://127.1',
  'https://10.0.0.1',
  'https://[::1]',
  'https://[::ffff:127.0.0.1]',
  'https://host.localhost',
  'https://host.local',
  'https://host.internal',
  'https://navi.example.com',
  'https://navi.invalid',
  'https://localhost',
  'http://discord.com',
  'https://user:pass@discord.com',
  'https://discord.com/path',
  'not-a-url',
])('rejects non-public or non-origin release value %s', (value) => {
  expect(isPublicHttpsOrigin(value)).toBe(false);
});
it('checks DNS-host syntax without claiming DNS, TLS or service ownership', () => {
  expect(isPublicHttpsOrigin('https://discord.com')).toBe(true); // Syntax fixture only.
  expect(isPublicHttpsOrigin(undefined)).toBe(false);
});
it('requires a scope and never authorizes execution even with a clean plan', () => {
  expect(controlledTestPlan(routes, []).blockers).toContain('test_scope_not_selected');
  const plan = controlledTestPlan(routes, [], scope);
  expect(plan.blockers).toEqual([]);
  expect(plan).toMatchObject({
    selectedSubscriptions: 2,
    eligibleNoMentionSubscriptions: 2,
    sends: 0,
    webhookMutations: 0,
    databaseMutations: 0,
    controlledMonitoringReady: false,
    liveExecutionAuthorized: false,
  });
});
it('blocks everyone and role mentions, unapproved channels/guilds, and shared sources', () => {
  expect(
    controlledTestPlan([{ ...routes[0]!, mentionEveryone: true }, routes[1]!], [], scope).blockers,
  ).toContain('selected_destination_has_mentions');
  expect(
    controlledTestPlan([{ ...routes[0]!, roleId: '444444444444444444' }, routes[1]!], [], scope)
      .eligibleNoMentionSubscriptions,
  ).toBe(1);
  const other = { ...routes[0]!, guildId: '555555555555555555' };
  const plan = controlledTestPlan([...routes, other], [], scope);
  expect(plan.blockers).toContain('other_enabled_destinations');
  expect(plan.blockers).toContain('shared_source_outside_test_guild');
  expect(
    controlledTestPlan([{ ...routes[0]!, channelId: other.guildId }], [], scope).blockers,
  ).toContain('selected_destination_not_configured');
});
it('does not admit newly added unapproved sources in an approved guild/channel', () => {
  expect(
    controlledTestPlan([...routes, { ...routes[0]!, sourceId: 'unapproved-source' }], [], scope)
      .blockers,
  ).toContain('other_enabled_destinations');
});
it('excludes pre-window history, uncertain, sent, sending and failed deliveries without altering records', () => {
  const records = ['sent', 'sending', 'failed', 'uncertain'].map((s) =>
    delivery(s, '2026-10-22T12:01:00.000Z'),
  );
  records.push(
    delivery('pending', '2026-10-22T11:59:00.000Z'),
    delivery('pending', '2026-10-22T12:01:00.000Z'),
  );
  const before = JSON.stringify({ routes, records });
  const plan = controlledTestPlan(routes, records, scope);
  expect(plan.pendingAfterCutoff).toBe(1);
  expect(plan.preservedUncertainRecords).toBe(1);
  expect(JSON.stringify({ routes, records })).toBe(before);
});
it('never calls network delivery or webhook code during dry-run', () => {
  const network = vi.spyOn(globalThis, 'fetch');
  try {
    controlledTestPlan(routes, [], scope);
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});
it('fails closed for malformed scope, duplicate provider and injected execution options', () => {
  for (const value of [
    null,
    { ...scope, approve: true },
    { ...scope, notBefore: 'yesterday' },
    { ...scope, destinations: [...scope.destinations, scope.destinations[0]] },
    { ...scope, destinations: [{ ...scope.destinations[0], provider: 'other' }] },
  ])
    expect(() => readTestScope(value)).toThrow('Invalid test scope.');
});
it('rejects unknown CLI options before reading environment/database and never prints input', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/plan-controlled-test.ts', '--send=FAKE_SECRET'],
    { encoding: 'utf8', timeout: 10000 },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('check_scope_file_and_database');
  expect(result.stderr).not.toContain('FAKE_SECRET');
  expect(result.stdout).toBe('');
});
it.each(['--dry-run', '--send=FAKE_SECRET'])(
  'worker rejects unsupported %s rather than silently starting monitoring',
  (flag) => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'apps/worker/src/index.ts', flag],
      { encoding: 'utf8', timeout: 10000 },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('worker_invalid_options');
    expect(result.stderr).not.toContain('FAKE_SECRET');
    expect(result.stdout).toBe('');
  },
);
