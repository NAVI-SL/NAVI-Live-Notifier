import { expect, it } from 'vitest';
import { createTelemetry } from '../apps/worker/src/telemetry';

it('counts retry/failure/uncertainty independently from acknowledged deliveries and rejects invalid latency samples', () => {
  const metrics = createTelemetry(() => 1000);
  metrics.source('youtube', false);
  metrics.source('kick', true);
  metrics.detected([12, 24, NaN, -1, Infinity]);
  metrics.delivery('pending', 'discord_rate_limited');
  metrics.delivery('uncertain', 'delivery_interrupted', 500);
  metrics.delivery('failed', 'bot_not_installed', 500);
  metrics.delivery('sent', null, 100);
  expect(metrics.snapshot()).toMatchObject({
    processStartedAt: 1000,
    sourceChecks: { youtube: 1, kick: 1 },
    sourceFailures: { youtube: 1, kick: 0 },
    deliveryOutcomes: { pending: 1, uncertain: 1, failed: 1, sent: 1 },
    discordRateLimits: 1,
    firstDetectionLagMs: { samples: 2, totalMs: 36, maxMs: 24 },
    streamStartToBrokerAckMs: { samples: 1, totalMs: 100, maxMs: 100 },
  });
  metrics.snapshot().deliveryOutcomes.sent = 100;
  expect(metrics.snapshot().deliveryOutcomes.sent).toBe(1);
  expect(createTelemetry(() => 2000).snapshot().deliveryOutcomes.sent).toBe(0);
});
