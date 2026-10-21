import type { MonitoringEnvironment } from '@navi/config';
import type { MonitoringRepository } from '@navi/database';
import { CoordinationBusyError } from '@navi/database';
import type { MonitoringProviders } from './providers.js';
import { boundedBody, ProviderError } from './providers.js';
import { youtubeCallback, youtubeTopic } from './webhooks.js';
import { createTelemetry } from './telemetry.js';
type Coordinator = <T>(id: string, operation: (assertHeld: () => void) => Promise<T>) => Promise<T>;
export function youtubePollInterval(sources: number, budget: number) {
  // Each reconciliation discovers new IDs as well as checking known videos:
  // channels.list + playlistItems.list + up to two videos.list batches.
  // Reserve 20% for send confirmations, webhook hints and retries.
  const available = Math.max(1, Math.floor(budget * 0.8));
  return Math.max(60_000, Math.ceil((86400_000 * sources * 4) / available));
}
export function retryDelay(value: string | null, now: number, attempt: number) {
  if (value !== null) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) return Math.max(1, Math.ceil(numeric));
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(1, Math.ceil((date - now) / 1000));
  }
  return Math.min(300, 5 * 2 ** Math.min(attempt, 6));
}
export function createMonitor(
  env: MonitoringEnvironment,
  repo: MonitoringRepository,
  providers: MonitoringProviders,
  coordinate: Coordinator,
  fetcher: typeof fetch = fetch,
  now = Date.now,
  log: (event: Record<string, unknown>) => void = (x) => console.info(JSON.stringify(x)),
) {
  let stopped = false;
  let lastTick: number | null = null;
  let databaseHealthy: boolean | null = null;
  let botHealthy = false;
  let botCheckedAt = 0;
  let standby = false;
  const telemetry = createTelemetry(now);
  let quota: Awaited<ReturnType<MonitoringRepository['quotaSnapshot']>> = [];
  let summaryAt: number | null = null;
  let quotaCheckedAt: number | null = null;
  let quotaAvailable = false;
  const requiredProviders = new Set<string>();
  const platforms = new Map<string, { provider: string; ok: boolean; checkedAt: number }>();
  async function poll(assertHeld: () => void) {
    const sources = await repo.sources();
    requiredProviders.clear();
    for (const source of sources) requiredProviders.add(source.provider);
    for (const id of platforms.keys()) if (!sources.some((s) => s.id === id)) platforms.delete(id);
    const interval = youtubePollInterval(
      sources.filter((s) => s.provider === 'youtube').length,
      env.YOUTUBE_DAILY_BUDGET,
    );
    sources.sort((a, b) => a.nextPoll.getTime() - b.nextPoll.getTime() || a.id.localeCompare(b.id));
    for (const source of sources) {
      if (stopped) return;
      assertHeld();
      if (source.renewAfter.getTime() <= now() && env.MONITOR_PUBLIC_ORIGIN) {
        try {
          await repo.state(source.id, { renewAfter: new Date(now() + 600_000) });
          if (source.provider === 'kick') {
            const upstreamId = await providers.subscriptions(source);
            await repo.state(source.id, { upstreamId, renewAfter: new Date(now() + 3600_000) });
          } else {
            await repo.state(source.id, { hubPending: true });
            const response = await fetcher('https://pubsubhubbub.appspot.com/subscribe', {
              method: 'POST',
              redirect: 'error',
              signal: AbortSignal.timeout(8000),
              body: new URLSearchParams({
                'hub.mode': 'subscribe',
                'hub.topic': youtubeTopic(source.externalId),
                'hub.callback': youtubeCallback(env, source.externalId),
                'hub.secret': env.MONITOR_WEBHOOK_SECRET!,
                'hub.lease_seconds': '86400',
              }),
            });
            await boundedBody(response);
            if (!response.ok) throw new ProviderError('youtube_subscription_failed', 600);
            // Verification callback owns the actual lease; do not assume requested duration.
          }
        } catch (error) {
          log({
            event: 'subscription_error',
            sourceId: source.id,
            code: error instanceof ProviderError ? error.code : 'subscription_unavailable',
          });
        }
      }
      if (source.nextPoll.getTime() > now()) continue;
      try {
        await repo.state(source.id, {
          nextPoll: new Date(now() + (source.provider === 'youtube' ? interval : 60_000)),
        });
        let snapshot = await repo.mergeCandidates(source.id, []);
        // Local polling has no webhook to add new video IDs between metadata refreshes.
        // Rechecking only old candidates for 15 minutes can miss an entire broadcast.
        if (source.provider === 'youtube' || source.discoverAfter.getTime() <= now()) {
          const discovered = await providers.discover(source);
          await repo.refreshIdentity(source.id, discovered.displayName, discovered.canonicalUrl);
          snapshot = await repo.mergeCandidates(source.id, discovered.ids);
          await repo.state(source.id, { discoverAfter: new Date(now() + 900_000) });
          if (source.provider === 'youtube')
            log({
              event: 'youtube_discovered',
              sourceId: source.id,
              candidateCount: snapshot.candidates.length,
            });
        }
        const observed = await providers.observe(source, snapshot.candidates);
        assertHeld();
        const detections = await repo.observe(source.id, observed.live, source.initialized);
        telemetry.detected(detections);
        await repo.reconcileCandidates(source.id, snapshot.hintVersion, observed.keep);
        platforms.set(source.id, { provider: source.provider, ok: true, checkedAt: now() });
        telemetry.source(source.provider, true);
        log({
          event: 'source_checked',
          sourceId: source.id,
          provider: source.provider,
          liveCount: observed.live.length,
          newPostBaselineSessions: detections.length,
          baseline: !source.initialized,
          ...(source.provider === 'youtube'
            ? { candidateCount: snapshot.candidates.length, pollIntervalMs: interval }
            : {}),
        });
      } catch (error) {
        telemetry.source(source.provider, false);
        platforms.set(source.id, { provider: source.provider, ok: false, checkedAt: now() });
        const delay = error instanceof ProviderError ? error.retryAfter : 60;
        await repo.state(source.id, { nextPoll: new Date(now() + delay * 1000) });
        log({
          event: 'source_error',
          sourceId: source.id,
          provider: source.provider,
          code: error instanceof ProviderError ? error.code : 'observation_unavailable',
        });
      }
    }
  }
  async function deliver() {
    const confirmations = new Map<string, ReturnType<MonitoringProviders['observe']>>();
    let confirmationsAt = now();
    for (let i = 0; i < 50; i++) {
      if (stopped) return;
      if (now() - confirmationsAt > 30_000) {
        confirmations.clear();
        confirmationsAt = now();
      }
      const delivery = await repo.claim();
      if (!delivery) return;
      telemetry.delivery('sending', null);
      let outcome: string | undefined;
      let reason: string | null = null;
      let streamStartedAt: number | undefined;
      const finish = async (
        status: Parameters<typeof repo.finish>[1],
        code: string | null,
        delay = 0,
      ) => {
        const applied = await repo.finish(delivery.id, status, code, delay, delivery.attempts);
        outcome = applied ? status : 'retained';
        reason = applied ? code : 'stale_completion';
        if (applied)
          telemetry.delivery(
            status,
            code,
            streamStartedAt === undefined ? undefined : now() - streamStartedAt,
          );
      };
      let initiated = false;
      try {
        await coordinate(`live:${delivery.subscriptionId}`, async (assertHeld) => {
          const saved = await repo.payload(delivery);
          if (!saved) {
            await finish('suppressed', 'configuration_changed_or_stale');
            return;
          }
          const { source, ...payload } = saved;
          streamStartedAt = Date.parse(payload.live.startedAt);
          // Confirm current LIVE again before send; a webhook or old DB row cannot authorize a message.
          const key = `${source.id}:${payload.live.sessionKey}`;
          let confirmation = confirmations.get(key);
          if (!confirmation) {
            confirmation = providers.observe(source, [payload.live.sessionKey]);
            confirmations.set(key, confirmation);
          }
          let live;
          try {
            live = (await confirmation).live.find((x) => x.sessionKey === payload.live.sessionKey);
          } catch (error) {
            await finish(
              delivery.attempts < 5 ? 'pending' : 'failed',
              'confirmation_unavailable',
              error instanceof ProviderError ? error.retryAfter : 60,
            );
            return;
          }
          if (
            !live ||
            now() - Date.parse(live.startedAt) > 600_000 ||
            Date.parse(live.startedAt) > now()
          ) {
            await finish('suppressed', 'stream_not_live');
            return;
          }
          payload.live = live;
          assertHeld();
          if (stopped) {
            await finish('pending', 'worker_stopping', 5);
            return;
          }
          initiated = true;
          const response = await fetcher(
            `${env.BOT_INTERNAL_URL}/internal/guilds/${delivery.guildId}/live-notification`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.BOT_INTERNAL_SECRET!}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
              redirect: 'error',
              signal: AbortSignal.timeout(30000),
            },
          );
          const text = await boundedBody(response, 12000);
          let result: { error?: string; status?: string; retrySafe?: boolean } = {};
          try {
            const parsed: unknown = JSON.parse(text);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) result = parsed;
          } catch {
            /* uncertain below */
          }
          if (response.ok && result.status === 'sent') await finish('sent', null);
          else if (
            response.status === 429 ||
            (response.status === 503 &&
              result.retrySafe === true &&
              ['bot_unavailable', 'discord_invalid_response'].includes(result.error ?? ''))
          ) {
            await finish(
              delivery.attempts < 5 ? 'pending' : 'failed',
              response.status === 429 ? 'discord_rate_limited' : 'discord_preflight_unavailable',
              retryDelay(response.headers.get('retry-after'), now(), delivery.attempts),
            );
          } else if ([400, 401, 403, 404, 409, 413, 422].includes(response.status))
            await finish(
              'failed',
              [
                'bot_not_installed',
                'bot_missing_permissions',
                'bot_missing_embed_permissions',
                'everyone_mention_not_permitted',
                'notification_channel_unavailable',
                'notification_role_unavailable',
                'notification_disabled',
              ].includes(result.error ?? '')
                ? result.error!
                : 'discord_rejected',
            );
          else await finish('uncertain', 'delivery_uncertain');
          log({
            event: 'delivery_attempt',
            deliveryId: delivery.id,
            status: response.status,
            state: outcome,
            code: reason,
            attempt: delivery.attempts,
            ...(outcome === 'sent' && streamStartedAt !== undefined
              ? { streamStartToBrokerAckMs: Math.max(0, now() - streamStartedAt) }
              : {}),
          });
        });
      } catch {
        await finish(
          initiated ? 'uncertain' : delivery.attempts < 5 ? 'pending' : 'failed',
          initiated ? 'delivery_interrupted' : 'pre_send_unavailable',
          retryDelay(null, now(), delivery.attempts),
        );
        log({
          event: 'delivery_error',
          deliveryId: delivery.id,
          attempt: delivery.attempts,
          code: initiated ? 'delivery_uncertain' : 'pre_send_unavailable',
        });
      }
    }
  }
  let cleanupAfter = 0;
  return {
    stop() {
      stopped = true;
    },
    health() {
      const provider = (name: 'youtube' | 'kick', configured: boolean) => {
        const checks = [...platforms.values()].filter((s) => s.provider === name);
        return !configured
          ? 'not_configured'
          : !checks.length
            ? 'idle'
            : checks.some((s) => !s.ok || now() - s.checkedAt > 900_000)
              ? 'degraded'
              : 'ok';
      };
      const integrations = {
        youtube: provider('youtube', !!env.YOUTUBE_API_KEY),
        kick: provider('kick', !!env.KICK_CLIENT_ID && !!env.KICK_CLIENT_SECRET),
      };
      const ready =
        !stopped &&
        databaseHealthy === true &&
        botHealthy &&
        lastTick !== null &&
        now() - lastTick < 120_000 &&
        !Object.values(integrations).includes('degraded');
      const requiredHealthy = [...requiredProviders].every(
        (name) => integrations[name as 'youtube' | 'kick'] === 'ok',
      );
      return {
        status: ready && requiredHealthy ? 'ok' : 'degraded',
        worker: stopped ? 'stopping' : standby ? 'standby' : 'running',
        database: databaseHealthy === null ? 'unknown' : databaseHealthy ? 'ok' : 'unavailable',
        bot: botHealthy ? 'ok' : 'unavailable',
        integrations,
        heartbeat: {
          lastCompletedTickAt: lastTick,
          ageMs: lastTick === null ? null : Math.max(0, now() - lastTick),
        },
        metrics: telemetry.snapshot(),
        quota: {
          available: quotaAvailable,
          checkedAt: quotaCheckedAt,
          reservations: structuredClone(quota),
          youtubeDailyBudget: env.YOUTUBE_DAILY_BUDGET,
        },
      };
    },
    async tick() {
      if (stopped) return;
      try {
        await coordinate('monitor-leader', async (assertHeld) => {
          standby = false;
          if (stopped) return;
          if (now() - botCheckedAt >= 30_000) {
            botCheckedAt = now();
            try {
              const response = await fetcher(`${env.BOT_INTERNAL_URL}/internal/health`, {
                headers: { Authorization: `Bearer ${env.BOT_INTERNAL_SECRET!}` },
                redirect: 'error',
                signal: AbortSignal.timeout(8000),
              });
              const result: unknown = JSON.parse(await boundedBody(response, 1000));
              botHealthy =
                response.ok &&
                !!result &&
                typeof result === 'object' &&
                'status' in result &&
                result.status === 'ok';
            } catch {
              botHealthy = false;
            }
          }
          await poll(assertHeld);
          assertHeld();
          await deliver();
          if (now() >= cleanupAfter) {
            await repo.cleanup();
            cleanupAfter = now() + 3600_000;
          }
          databaseHealthy = true;
          lastTick = now();
          if (summaryAt === null || now() - summaryAt >= 60_000) {
            summaryAt = now();
            try {
              quota = await repo.quotaSnapshot();
              quotaCheckedAt = now();
              quotaAvailable = true;
            } catch {
              quotaAvailable = false;
            }
            log({
              event: 'monitor_summary',
              time: new Date(now()).toISOString(),
              heartbeatAt: lastTick,
              metrics: telemetry.snapshot(),
              quotaAvailable,
              quotaCheckedAt,
              quota,
            });
          }
        });
      } catch (error) {
        if (error instanceof CoordinationBusyError) {
          standby = true;
          log({ event: 'monitor_standby', code: 'leader_busy' });
          return;
        }
        databaseHealthy = false;
        // eslint-disable-next-line preserve-caught-error -- Raw database/provider errors may contain credentials.
        throw new Error('Monitor tick unavailable.');
      }
    },
  };
}
