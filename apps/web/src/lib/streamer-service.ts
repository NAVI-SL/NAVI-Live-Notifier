import { createHmac, timingSafeEqual } from 'node:crypto';
import { RegistrationError, type ResolvedStreamer, type StreamerRepository } from '@navi/database';
import { AppError } from './errors';
import type { GuildService } from './guild-service';
import { streamerInput } from './streamer-input';

export function createStreamerService(deps: {
  guilds: Pick<GuildService, 'authorize' | 'identity'>;
  repository: StreamerRepository;
  resolve: (platform: unknown, input: unknown) => Promise<ResolvedStreamer>;
  secret: string;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  const attempts = new Map<string, { count: number; expires: number }>();
  const sign = (payload: string) =>
    createHmac('sha256', deps.secret).update(`navi-streamer-confirmation-v1:${payload}`).digest();
  async function access(headers: Headers, guildId: string) {
    await deps.guilds.authorize(headers, guildId);
    return deps.guilds.identity(headers);
  }
  async function operation<T>(callback: () => Promise<T>) {
    try {
      return await callback();
    } catch (error) {
      if (error instanceof RegistrationError)
        throw new AppError(error.code === 'subscription_not_found' ? 404 : 409, error.code);
      throw error;
    }
  }
  return {
    async list(headers: Headers, guildId: string) {
      await access(headers, guildId);
      await deps.repository.prune();
      return deps.repository.list(guildId);
    },
    async resolve(headers: Headers, guildId: string, platform: unknown, input: unknown) {
      const actor = await access(headers, guildId);
      for (const [key, value] of attempts) if (value.expires <= now()) attempts.delete(key);
      const bucket = attempts.get(actor.id) ?? { count: 0, expires: now() + 60_000 };
      attempts.set(actor.id, bucket);
      if (++bucket.count > 10)
        throw new AppError(429, 'lookup_rate_limited', Math.ceil((bucket.expires - now()) / 1000));
      streamerInput(platform, input);
      const account = await deps.resolve(platform, input);
      const payload = Buffer.from(
        JSON.stringify({ actor: actor.id, guildId, account, expires: now() + 10 * 60_000 }),
      ).toString('base64url');
      return { account, confirmation: `${payload}.${sign(payload).toString('base64url')}` };
    },
    async add(headers: Headers, guildId: string, receipt: unknown) {
      const actor = await access(headers, guildId);
      if (typeof receipt !== 'string' || receipt.length > 8192)
        throw new AppError(400, 'invalid_confirmation');
      const parts = receipt.split('.');
      const payload = parts[0] ?? '';
      const signature = Buffer.from(parts[1] ?? '', 'base64url');
      if (
        parts.length !== 2 ||
        signature.length !== 32 ||
        !timingSafeEqual(sign(payload), signature)
      )
        throw new AppError(400, 'invalid_confirmation');
      let data: { actor: string; guildId: string; account: ResolvedStreamer; expires: number };
      try {
        data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      } catch {
        throw new AppError(400, 'invalid_confirmation');
      }
      if (
        data.actor !== actor.id ||
        data.guildId !== guildId ||
        !Number.isFinite(data.expires) ||
        data.expires <= now()
      )
        throw new AppError(400, 'confirmation_expired');
      await operation(() => deps.repository.add(guildId, data.account));
    },
    async change(headers: Headers, guildId: string, id: string, enabled?: unknown) {
      await access(headers, guildId);
      if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))
        throw new AppError(400, 'invalid_subscription');
      if (enabled !== undefined && typeof enabled !== 'boolean')
        throw new AppError(400, 'invalid_enabled');
      await operation(() =>
        enabled === undefined
          ? deps.repository.remove(guildId, id)
          : deps.repository.setEnabled(guildId, id, enabled as boolean),
      );
    },
  };
}
