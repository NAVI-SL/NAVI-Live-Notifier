import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import { createServer } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { readMonitoringEnvironment } from '@navi/config';
import { notificationDiscordFixture, ids } from './notification-fixtures';
import { startWebhookServer } from '../apps/worker/src/server';
import type { MonitoringRepository, MonitoringSource } from '@navi/database';
import {
  createWebhookHandler,
  verifyKick,
  youtubeCallback,
  youtubeHints,
  youtubeTopic,
} from '../apps/worker/src/webhooks';
const env = readMonitoringEnvironment({
  MONITOR_PUBLIC_ORIGIN: 'https://hooks.example.com',
  MONITOR_WEBHOOK_SECRET: 'fake-test-hook-secret-at-least-32-chars',
});
const clock = Date.parse('2026-11-01T00:00:00Z');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const channelId = 'UC' + 'a'.repeat(22);
function fixture() {
  const sources = [
    { id: 'yt-source', provider: 'youtube', externalId: channelId, hubPending: true },
    { id: 'kick-source', provider: 'kick', externalId: '123', upstreamId: 'subscription-id' },
  ].map((value) => ({
    ...value,
    provider: value.provider as 'youtube' | 'kick',
    sourceId: value.id,
    initialized: true,
    baselineAt: new Date(clock),
    nextPoll: new Date(clock),
    discoverAfter: new Date(clock),
    candidates: [],
    hintVersion: 0,
    renewAfter: new Date(clock),
    upstreamId: value.upstreamId ?? null,
    hubPending: value.hubPending ?? false,
    hubExpires: null,
    displayName: 'Tester',
    canonicalUrl:
      value.provider === 'kick'
        ? 'https://kick.com/tester'
        : `https://www.youtube.com/channel/${channelId}`,
    verifiedAt: new Date(clock),
    expiresAt: new Date(clock + 86400000),
    createdAt: new Date(clock),
  })) satisfies MonitoringSource[];
  const repo = {
    sources: vi.fn(async () => sources),
    receipt: vi.fn(async () => {}),
    state: vi.fn(async () => {}),
  } as unknown as MonitoringRepository;
  const providers = { publicKey: vi.fn(async () => pem) };
  return { repo, providers, handler: createWebhookHandler(env, repo, providers, () => clock) };
}
function kickRequest(body: string, changed = false, time = new Date(clock).toISOString()) {
  const id = '01TESTMESSAGE';
  const signature = sign('RSA-SHA256', Buffer.from(`${id}.${time}.${body}`), privateKey).toString(
    'base64',
  );
  return new Request('http://127.0.0.1:4100/webhooks/kick', {
    method: 'POST',
    headers: {
      'Kick-Event-Message-Id': id,
      'Kick-Event-Message-Timestamp': time,
      'Kick-Event-Signature': signature,
      'Kick-Event-Type': 'livestream.status.updated',
      'Kick-Event-Version': '1',
      'Kick-Event-Subscription-Id': 'subscription-id',
    },
    body: changed ? body + ' ' : body,
  });
}
describe('secure provider webhook ingress (generated test keys, no live provider events)', () => {
  it('bounds public-key fetches during an initial outage despite repeated fresh signed requests', async () => {
    const { handler, providers, repo } = fixture();
    providers.publicKey.mockRejectedValue(new Error('FAKE_UPSTREAM_SECRET'));
    for (let i = 0; i < 3; i++) {
      const response = await handler(kickRequest('{"broadcaster":{"user_id":123}}'));
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain('FAKE_UPSTREAM_SECRET');
    }
    expect(providers.publicKey).toHaveBeenCalledTimes(1);
    expect(repo.receipt).not.toHaveBeenCalled();
  });
  it('preserves signed bytes through the real loopback HTTP adapter and bounds ingress', async () => {
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const address = probe.address();
    if (!address || typeof address === 'string') throw new Error('no test port');
    const port = address.port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    const { handler, repo } = fixture();
    const handled = vi.fn(handler);
    const stop = await startWebhookServer(port, handled);
    try {
      const signed = kickRequest('{"broadcaster":{"user_id":123},"title":"Unicode — live"}');
      const response = await fetch(`http://127.0.0.1:${port}/webhooks/kick`, {
        method: 'POST',
        headers: signed.headers,
        body: await signed.text(),
      });
      expect(response.status).toBe(204);
      expect(repo.receipt).toHaveBeenCalledTimes(1);
      handled.mockClear();
      expect(
        (
          await fetch(`http://127.0.0.1:${port}/webhooks/kick`, {
            method: 'POST',
            body: 'x'.repeat(65537),
          })
        ).status,
      ).toBe(413);
      expect(handled).not.toHaveBeenCalled();
    } finally {
      await stop();
    }
  });
  it('keeps the existing sample sender separate from automatic LIVE rendering and enable checks', async () => {
    const fixture = notificationDiscordFixture();
    const input = {
      requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      config: {
        channelId: ids.channel,
        roleId: ids.role,
        template: '{streamer} {platform} {title} {url}',
        enabled: false,
      },
      identity: {
        provider: 'kick',
        displayName: 'Tester',
        canonicalUrl: 'https://kick.com/tester',
      },
      live: {
        sessionKey: '2026-11-01T00:00:00Z',
        title: 'Actual @everyone title',
        url: 'https://kick.com/tester',
        startedAt: '2026-11-01T00:00:00Z',
      },
    };
    await expect(fixture.bot.sendLive(ids.guild, input)).rejects.toMatchObject({
      code: 'notification_disabled',
    });
    expect(fixture.rest.post).not.toHaveBeenCalled();
    await fixture.bot.sendTest(ids.guild, input);
    expect(JSON.stringify(fixture.rest.post.mock.calls)).toContain('NAVI TEST');
    fixture.rest.post.mockClear();
    await fixture.bot.sendLive(ids.guild, { ...input, config: { ...input.config, enabled: true } });
    const message = JSON.stringify(fixture.rest.post.mock.calls);
    expect(message).not.toContain('NAVI TEST');
    expect(message).not.toContain('@everyone');
    expect(message).toContain('Actual');
    expect(message).toContain('https://kick.com/tester');
  });
  it('accepts valid Kick RSA signatures only as reconciliation hints', async () => {
    const { repo, handler } = fixture();
    const body = JSON.stringify({
      broadcaster: { user_id: 123 },
      is_live: true,
      title: 'Never trusted as live evidence',
    });
    expect((await handler(kickRequest(body))).status).toBe(204);
    expect(repo.receipt).toHaveBeenCalledWith('kick:01TESTMESSAGE', 'kick-source');
  });
  it('rejects tampering, stale signatures, unknown subscription and absent signatures', async () => {
    const { repo, handler } = fixture();
    const body = '{"broadcaster":{"user_id":123}}';
    expect((await handler(kickRequest(body, true))).status).toBe(403);
    expect(
      (await handler(kickRequest(body, false, new Date(clock - 600000).toISOString()))).status,
    ).toBe(403);
    expect((await handler(kickRequest('{"broadcaster":{"user_id":456}}'))).status).toBe(404);
    expect(
      (await handler(new Request('http://127.0.0.1:4100/webhooks/kick', { method: 'POST', body })))
        .status,
    ).toBe(403);
    expect(repo.receipt).not.toHaveBeenCalled();
  });
  it('refreshes the hosted Kick key once when rotation invalidates a cached key', async () => {
    const { repo } = fixture();
    let time = clock;
    const wrong = generateKeyPairSync('rsa', { modulusLength: 2048 })
      .publicKey.export({ type: 'spki', format: 'pem' })
      .toString();
    const keys = { publicKey: vi.fn().mockResolvedValueOnce(wrong).mockResolvedValueOnce(pem) };
    const handler = createWebhookHandler(env, repo, keys, () => time),
      body = '{"broadcaster":{"user_id":123}}';
    expect((await handler(kickRequest(body))).status).toBe(403);
    time += 61000;
    expect((await handler(kickRequest(body, false, new Date(time).toISOString()))).status).toBe(
      204,
    );
    expect(keys.publicKey).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid algorithm/body using the official signed-byte construction', () => {
    const request = kickRequest('{}');
    expect(verifyKick(request.headers, '{}', pem, clock)).toBe(true);
    expect(verifyKick(request.headers, '{ }', pem, clock)).toBe(false);
  });
  it('backs off expired-key refresh outages and accepts recovery only after verification', async () => {
    const { repo } = fixture();
    let time = clock;
    const keys = {
      publicKey: vi
        .fn()
        .mockResolvedValueOnce(pem)
        .mockRejectedValueOnce(new Error('FAKE_SECRET'))
        .mockResolvedValue(pem),
    };
    const handler = createWebhookHandler(env, repo, keys, () => time);
    const body = '{"broadcaster":{"user_id":123}}';
    expect((await handler(kickRequest(body))).status).toBe(204);
    time += 3600001;
    for (let i = 0; i < 3; i++) {
      expect((await handler(kickRequest(body, false, new Date(time).toISOString()))).status).toBe(
        503,
      );
    }
    expect(keys.publicKey).toHaveBeenCalledTimes(2);
    time += 60001;
    expect((await handler(kickRequest(body, false, new Date(time).toISOString()))).status).toBe(
      204,
    );
    expect(keys.publicKey).toHaveBeenCalledTimes(3);
  });
  it('verifies pending YouTube topic/challenge and records the actual lease', async () => {
    const { handler, repo } = fixture();
    const url = new URL(youtubeCallback(env, channelId));
    url.search = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.topic': youtubeTopic(channelId),
      'hub.challenge': 'test-challenge',
      'hub.lease_seconds': '3600',
    }).toString();
    const result = await handler(new Request(url));
    expect(result.status).toBe(200);
    expect(await result.text()).toBe('test-challenge');
    expect(repo.state).toHaveBeenCalledWith(
      'yt-source',
      expect.objectContaining({ hubPending: false, hubExpires: new Date(clock + 3600000) }),
    );
    url.searchParams.set('hub.topic', 'https://attacker.example/feed');
    expect((await handler(new Request(url))).status).toBe(403);
  });
  it('requires a valid YouTube HMAC and channel-bound Atom hint', async () => {
    const { handler, repo } = fixture();
    const body = `<feed><entry><yt:videoId>abcdefghijk</yt:videoId><yt:channelId>${channelId}</yt:channelId></entry></feed>`;
    const url = youtubeCallback(env, channelId);
    expect((await handler(new Request(url, { method: 'POST', body }))).status).toBe(403);
    const signature =
      'sha1=' + createHmac('sha1', env.MONITOR_WEBHOOK_SECRET!).update(body).digest('hex');
    expect(
      (
        await handler(
          new Request(url, { method: 'POST', headers: { 'x-hub-signature': signature }, body }),
        )
      ).status,
    ).toBe(204);
    expect(repo.receipt).toHaveBeenCalledWith(expect.stringMatching(/^youtube:/), 'yt-source', [
      'abcdefghijk',
    ]);
    expect(() =>
      youtubeHints('<!DOCTYPE x [<!ENTITY evil SYSTEM "file:///secret">]><feed/>', channelId),
    ).toThrow();
    expect(() => youtubeHints(body.replace(channelId, 'UC' + 'b'.repeat(22)), channelId)).toThrow();
  });
  it('does not acknowledge events when durable receipt storage fails', async () => {
    const { handler, repo } = fixture();
    vi.mocked(repo.receipt).mockRejectedValueOnce(new Error('FAKE_DATABASE_SECRET'));
    const response = await handler(kickRequest('{"broadcaster":{"user_id":123}}'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('SECRET');
  });
  it('rejects public callback configuration without HTTPS and long secrets', () => {
    expect(() =>
      readMonitoringEnvironment({
        MONITOR_PUBLIC_ORIGIN: 'http://localhost:4100',
        MONITOR_WEBHOOK_SECRET: 'short',
      }),
    ).toThrow();
    expect(() => readMonitoringEnvironment({ MONITORING_ENABLED: 'true' })).toThrow(
      'BOT_INTERNAL_SECRET',
    );
  });
});
