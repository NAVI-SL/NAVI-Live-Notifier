/** Bounded process-local aggregates. Durable admission and recovery remain in PostgreSQL. */
export function createTelemetry(now: () => number) {
  const latency = () => ({ samples: 0, totalMs: 0, maxMs: 0 });
  const metrics = {
    processStartedAt: now(),
    sourceChecks: { youtube: 0, kick: 0 },
    sourceFailures: { youtube: 0, kick: 0 },
    deliveryOutcomes: { pending: 0, sending: 0, sent: 0, failed: 0, uncertain: 0, suppressed: 0 },
    discordRateLimits: 0,
    firstDetectionLagMs: latency(),
    streamStartToBrokerAckMs: latency(),
  };
  function sample(metric: ReturnType<typeof latency>, value: number) {
    if (!Number.isFinite(value) || value < 0) return;
    metric.samples++;
    metric.totalMs += value;
    metric.maxMs = Math.max(metric.maxMs, value);
  }
  return {
    source(provider: 'youtube' | 'kick', ok: boolean) {
      metrics.sourceChecks[provider]++;
      if (!ok) metrics.sourceFailures[provider]++;
    },
    detected(delays: number[]) {
      for (const delay of delays) sample(metrics.firstDetectionLagMs, delay);
    },
    delivery(state: keyof typeof metrics.deliveryOutcomes, code: string | null, lag?: number) {
      metrics.deliveryOutcomes[state]++;
      if (code === 'discord_rate_limited') metrics.discordRateLimits++;
      if (state === 'sent' && lag !== undefined) sample(metrics.streamStartToBrokerAckMs, lag);
    },
    snapshot: () => structuredClone(metrics),
  };
}
