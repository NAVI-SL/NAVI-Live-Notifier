import type { AuthEnvironment } from '@navi/config';
import {
  isDiscordId,
  type NotificationTargets,
  type NotificationIdentity,
  type NotificationConfig,
} from '@navi/core';
import { AppError } from './errors';
const errors = new Set([
  'bot_not_installed',
  'bot_missing_permissions',
  'bot_missing_embed_permissions',
  'everyone_mention_not_permitted',
  'everyone_mention_youtube_only',
  'bot_unavailable',
  'discord_invalid_response',
  'discord_request_rejected',
  'discord_rate_limited',
  'notification_channel_unavailable',
  'notification_role_unavailable',
  'test_delivery_uncertain',
]);
export function createNotificationBroker(
  environment: Pick<AuthEnvironment, 'BOT_INTERNAL_URL' | 'BOT_INTERNAL_SECRET'>,
  fetcher: typeof fetch = fetch,
) {
  async function call(guildId: string, operation: string, payload?: unknown) {
    let response: Response;
    let body: unknown;
    try {
      response = await fetcher(
        `${environment.BOT_INTERNAL_URL}/internal/guilds/${guildId}/${operation}`,
        {
          method: payload === undefined ? 'GET' : 'POST',
          headers: {
            Authorization: `Bearer ${environment.BOT_INTERNAL_SECRET}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(payload === undefined ? 20000 : 30000),
          ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
        },
      );
      const text = await response.text();
      if (text.length > 1024 * 1024) throw new Error('oversized');
      body = JSON.parse(text);
    } catch {
      throw new AppError(
        503,
        payload === undefined ? 'bot_unavailable' : 'test_delivery_uncertain',
      );
    }
    if (!response.ok) {
      const code =
        body &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error === 'string' &&
        errors.has(body.error)
          ? body.error
          : 'bot_unavailable';
      const delay = Number(response.headers.get('retry-after'));
      throw new AppError(
        [400, 403, 404, 409, 429, 502, 503].includes(response.status) ? response.status : 503,
        code,
        response.status === 429
          ? Math.ceil(Number.isFinite(delay) && delay > 0 ? delay : 60)
          : undefined,
      );
    }
    return body;
  }
  return {
    async targets(guildId: string, fresh = false): Promise<NotificationTargets> {
      const body = await call(guildId, `notification-targets${fresh ? '?fresh=1' : ''}`);
      if (!body || typeof body !== 'object' || !('channels' in body) || !('roles' in body))
        throw new AppError(503, 'discord_invalid_response');
      const valid = (items: unknown): items is { id: string; name: string }[] =>
        Array.isArray(items) &&
        items.length <= 1000 &&
        items.every(
          (item) =>
            item &&
            typeof item === 'object' &&
            isDiscordId(item.id) &&
            typeof item.name === 'string' &&
            item.name.length <= 100,
        );
      if (!valid(body.channels) || !valid(body.roles))
        throw new AppError(503, 'discord_invalid_response');
      for (const channel of body.channels) {
        const capabilities = channel as Record<string, unknown>;
        for (const field of ['canEmbed', 'canMentionEveryone'])
          if (capabilities[field] !== undefined && typeof capabilities[field] !== 'boolean')
            throw new AppError(503, 'discord_invalid_response');
      }
      return { channels: body.channels, roles: body.roles };
    },
    async sendTest(
      guildId: string,
      payload: { config: NotificationConfig; identity: NotificationIdentity; requestId: string },
    ) {
      const result = await call(guildId, 'test-notification', payload);
      if (
        !result ||
        typeof result !== 'object' ||
        !('status' in result) ||
        result.status !== 'sent'
      )
        throw new AppError(503, 'test_delivery_uncertain');
    },
  };
}
export type NotificationBroker = ReturnType<typeof createNotificationBroker>;
