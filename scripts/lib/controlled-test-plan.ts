export type TestScope = {
  guildId: string;
  notBefore: string;
  destinations: { provider: 'youtube' | 'kick'; sourceId: string; channelId: string }[];
};
export type TestRoute = {
  subscriptionId: string;
  sourceId: string;
  provider: string;
  guildId: string;
  channelId: string | null;
  enabled: boolean;
  notificationsEnabled: boolean;
  roleId: string | null;
  mentionEveryone: boolean;
};
export type TestDelivery = {
  sourceId: string;
  guildId: string;
  channelId: string;
  status: string;
  startedAt: string;
};

/** Scope is planning input, never execution authorization or a webhook credential. */
export function readTestScope(value: unknown): TestScope {
  const fail = () => {
    throw new Error('Invalid test scope.');
  };
  if (!value || typeof value !== 'object') return fail();
  const s = value as Record<string, unknown>;
  if (
    Object.keys(s).sort().join(',') !== 'destinations,guildId,notBefore' ||
    typeof s.guildId !== 'string' ||
    !/^\d{17,20}$/.test(s.guildId) ||
    typeof s.notBefore !== 'string' ||
    !Number.isFinite(Date.parse(s.notBefore)) ||
    new Date(s.notBefore).toISOString() !== s.notBefore ||
    !Array.isArray(s.destinations) ||
    s.destinations.length < 1 ||
    s.destinations.length > 2
  )
    return fail();
  const destinations = s.destinations.map((value): TestScope['destinations'][number] => {
    if (!value || typeof value !== 'object') return fail();
    const d = value as Record<string, unknown>;
    if (
      Object.keys(d).sort().join(',') !== 'channelId,provider,sourceId' ||
      (d.provider !== 'youtube' && d.provider !== 'kick') ||
      typeof d.channelId !== 'string' ||
      !/^\d{17,20}$/.test(d.channelId) ||
      typeof d.sourceId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(d.sourceId)
    )
      return fail();
    return { provider: d.provider, channelId: d.channelId, sourceId: d.sourceId };
  });
  if (new Set(destinations.map((d) => d.provider)).size !== destinations.length) return fail();
  return { guildId: s.guildId, notBefore: s.notBefore, destinations };
}

/** Pure offline dry-run: no sender, provider, executor or repository mutation accepted. */
export function controlledTestPlan(
  routes: TestRoute[],
  deliveries: TestDelivery[],
  scope?: TestScope,
) {
  if (scope) scope = readTestScope(scope);
  const matches = (r: TestRoute) =>
    !!scope &&
    r.guildId === scope.guildId &&
    scope.destinations.some(
      (d) => d.provider === r.provider && d.sourceId === r.sourceId && d.channelId === r.channelId,
    );
  const selected = routes.filter(matches);
  const eligible = selected.filter(
    (r) => r.enabled && r.notificationsEnabled && !r.roleId && !r.mentionEveryone,
  );
  const active = routes.filter((r) => r.enabled && r.notificationsEnabled);
  const sources = new Set(selected.map((r) => r.sourceId));
  const blockers = [
    ...(!scope ? ['test_scope_not_selected'] : []),
    ...(scope &&
    scope.destinations.some(
      (d) =>
        !selected.some(
          (r) =>
            r.provider === d.provider && r.sourceId === d.sourceId && r.channelId === d.channelId,
        ),
    )
      ? ['selected_destination_not_configured']
      : []),
    ...(selected.some((r) => r.roleId || r.mentionEveryone)
      ? ['selected_destination_has_mentions']
      : []),
    ...(active.some((r) => !matches(r)) ? ['other_enabled_destinations'] : []),
    ...(routes.some((r) => sources.has(r.sourceId) && r.enabled && r.guildId !== scope?.guildId)
      ? ['shared_source_outside_test_guild']
      : []),
  ];
  const pending = deliveries.filter(
    (d) =>
      scope &&
      d.status === 'pending' &&
      d.guildId === scope.guildId &&
      eligible.some((r) => r.sourceId === d.sourceId && r.channelId === d.channelId) &&
      Number.isFinite(Date.parse(d.startedAt)) &&
      Date.parse(d.startedAt) >= Date.parse(scope.notBefore),
  );
  return {
    mode: 'offline_dry_run',
    liveExecutionAuthorized: false,
    workerStarted: false,
    sends: 0,
    webhookMutations: 0,
    databaseMutations: 0,
    scopeSelected: !!scope,
    selectedSubscriptions: selected.length,
    selectedProviders: [...new Set(selected.map((r) => r.provider))].sort(),
    eligibleNoMentionSubscriptions: eligible.length,
    preservedUncertainRecords: deliveries.filter((d) => d.status === 'uncertain').length,
    pendingAfterCutoff: pending.length,
    webhookPlan: 'skipped_requires_separate_approval',
    blockers,
    // This planner never arms or installs a policy into the monitoring worker.
    controlledMonitoringReady: false,
    requiredBeforeLive: [
      'explicit_live_approval',
      'refresh_and_verify_settings_start_cutoff',
      'webhook_change_approval_or_suppression',
    ],
  } as const;
}
