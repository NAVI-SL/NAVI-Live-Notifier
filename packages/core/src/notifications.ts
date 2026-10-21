export const DEFAULT_NOTIFICATION_TEMPLATE = '{streamer} is live on {platform}!\n{title}\n{url}';
export type NotificationConfig = {
  channelId: string;
  roleId: string | null;
  template: string;
  enabled: boolean;
  mentionEveryone?: boolean;
};
export type NotificationTargets = {
  channels: { id: string; name: string; canEmbed?: boolean; canMentionEveryone?: boolean }[];
  roles: { id: string; name: string }[];
};
export type NotificationIdentity = {
  provider: 'youtube' | 'kick';
  displayName: string;
  canonicalUrl: string;
};
export class NotificationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly retryAfter?: number,
  ) {
    super(code);
  }
}
export const isDiscordId = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{17,20}$/.test(value);
/** Compatibility for old checkbox settings: explicit everyone wins over a saved role. */
export function normalizeNotificationMentions(config: NotificationConfig): NotificationConfig {
  const { mentionEveryone, ...saved } = config;
  return mentionEveryone === true ? { ...saved, roleId: null, mentionEveryone: true } : saved;
}
export function readNotificationConfig(input: unknown): NotificationConfig {
  if (!input || typeof input !== 'object')
    throw new NotificationError(400, 'invalid_notification_settings');
  const value = input as Record<string, unknown>;
  if (
    !isDiscordId(value.channelId) ||
    (value.roleId !== null && !isDiscordId(value.roleId)) ||
    typeof value.enabled !== 'boolean' ||
    (value.mentionEveryone !== undefined && typeof value.mentionEveryone !== 'boolean') ||
    typeof value.template !== 'string'
  )
    throw new NotificationError(400, 'invalid_notification_settings');
  const template = value.template.trim();
  if (
    !template ||
    template.length > 1500 ||
    /@everyone|@here|<@/i.test(template) ||
    [...template].some(
      (character) => character.codePointAt(0)! < 32 && !['\t', '\n', '\r'].includes(character),
    )
  )
    throw new NotificationError(400, 'invalid_notification_template');
  if (/[{}]/.test(template.replace(/\{(streamer|platform|title|url)\}/g, '')))
    throw new NotificationError(400, 'unsupported_template_variable');
  return normalizeNotificationMentions({
    channelId: value.channelId,
    roleId: value.roleId,
    template,
    enabled: value.enabled,
    ...(value.mentionEveryone === true ? { mentionEveryone: true } : {}),
  });
}
export function validateNotificationTarget(
  config: NotificationConfig,
  targets: NotificationTargets,
) {
  if (!targets.channels.some((channel) => channel.id === config.channelId))
    throw new NotificationError(409, 'notification_channel_unavailable');
  if (config.roleId && !targets.roles.some((role) => role.id === config.roleId))
    throw new NotificationError(409, 'notification_role_unavailable');
  if (
    config.mentionEveryone &&
    !targets.channels.some(
      (channel) => channel.id === config.channelId && channel.canMentionEveryone === true,
    )
  )
    throw new NotificationError(403, 'everyone_mention_not_permitted');
}
export type LiveNotification = {
  sessionKey: string;
  title: string;
  url: string;
  startedAt: string;
  thumbnailUrl?: string;
  profileImageUrl?: string;
  categoryName?: string;
  categoryImageUrl?: string;
  streamerName?: string;
};
/** Optional artwork is never fetched by NAVI; only known Kick image/CDN hosts are forwarded. */
export function kickImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      !['kick.com', 'kicdn.com', 'cloudfront.net'].some(
        (host) => url.hostname === host || url.hostname.endsWith('.' + host),
      )
    )
      return;
    return url.toString();
  } catch {
    return;
  }
}
export type NotificationEmbed = {
  color: number;
  author: { name: string; url?: string; icon_url?: string };
  title?: string;
  url?: string;
  description: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string };
};
export type NotificationMessage = {
  content: string;
  allowed_mentions: { parse: string[]; roles: string[]; users: string[]; replied_user: boolean };
  flags: number;
  embeds?: NotificationEmbed[];
  components?: {
    type: 1;
    components: { type: 2; style: 5; label: string; url: string; emoji?: { name: string } }[];
  }[];
};
export function readLiveNotification(
  input: unknown,
  provider: NotificationIdentity['provider'],
): LiveNotification {
  const value = input as Record<string, unknown> | null;
  if (
    !value ||
    typeof value.sessionKey !== 'string' ||
    !value.sessionKey ||
    value.sessionKey.length > 128 ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    value.title.length > 500 ||
    typeof value.url !== 'string' ||
    typeof value.startedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.startedAt))
  )
    throw new NotificationError(400, 'invalid_live_notification');
  const valid =
    provider === 'youtube'
      ? /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(value.url)
      : /^https:\/\/kick\.com\/[A-Za-z0-9_-]{1,25}$/.test(value.url);
  if (!valid) throw new NotificationError(400, 'invalid_live_notification');
  if (value.thumbnailUrl !== undefined && provider === 'youtube') {
    if (typeof value.thumbnailUrl !== 'string' || value.thumbnailUrl.length > 2048)
      throw new NotificationError(400, 'invalid_live_notification');
    let image: URL;
    try {
      image = new URL(value.thumbnailUrl);
    } catch {
      throw new NotificationError(400, 'invalid_live_notification');
    }
    const videoId = new URL(value.url).searchParams.get('v');
    if (
      image.protocol !== 'https:' ||
      image.hostname !== 'i.ytimg.com' ||
      image.port ||
      image.username ||
      image.password ||
      image.hash ||
      !new RegExp(`^/vi(?:_webp)?/${videoId}/[A-Za-z0-9_-]{1,80}\\.(?:jpg|webp)$`).test(
        image.pathname,
      )
    )
      throw new NotificationError(400, 'invalid_live_notification');
  }
  return {
    sessionKey: value.sessionKey,
    title: value.title,
    url: value.url,
    startedAt: value.startedAt,
    ...(provider === 'youtube' && typeof value.thumbnailUrl === 'string'
      ? { thumbnailUrl: value.thumbnailUrl }
      : {}),
    ...(provider === 'kick'
      ? {
          ...(kickImageUrl(value.thumbnailUrl)
            ? { thumbnailUrl: kickImageUrl(value.thumbnailUrl)! }
            : {}),
          ...(kickImageUrl(value.profileImageUrl)
            ? { profileImageUrl: kickImageUrl(value.profileImageUrl)! }
            : {}),
          ...(kickImageUrl(value.categoryImageUrl)
            ? { categoryImageUrl: kickImageUrl(value.categoryImageUrl)! }
            : {}),
          ...(typeof value.categoryName === 'string' && value.categoryName.trim()
            ? { categoryName: value.categoryName.trim().slice(0, 200) }
            : {}),
          ...(typeof value.streamerName === 'string' && value.streamerName.trim()
            ? { streamerName: value.streamerName.trim().slice(0, 100) }
            : {}),
        }
      : {}),
  };
}
export function renderNotification(
  config: NotificationConfig,
  identity: NotificationIdentity,
  live?: LiveNotification,
): NotificationMessage {
  const neutralize = (value: string) => value.replace(/@/g, '@\u200b');
  const markdown = (value: string) => neutralize(value).replace(/([\\`*_{}[\]()<>~|])/g, '\\$1');
  const youtubeEmbed = live && identity.provider === 'youtube';
  const kickEmbed = live && identity.provider === 'kick';
  const everyone = !!live && config.mentionEveryone === true;
  const roleId = config.mentionEveryone ? null : config.roleId;
  const variables = {
    streamer: neutralize(
      kickEmbed ? (live.streamerName ?? identity.displayName) : identity.displayName,
    ),
    platform: identity.provider === 'youtube' ? 'YouTube' : 'Kick',
    title: neutralize(live?.title ?? 'Sample livestream title (test data)'),
    url: live ? `<${live.url}>` : neutralize(identity.canonicalUrl),
  };
  const text = config.template.replace(
    /\{(streamer|platform|title|url)\}/g,
    (_, key: keyof typeof variables) => variables[key],
  );
  const prefix = `${live ? '' : '[NAVI TEST — SAMPLE DATA]\n'}${everyone ? '@everyone\n' : ''}${roleId ? `<@&${roleId}> ` : ''}`;
  let content = prefix;
  for (const character of text) {
    if (content.length + character.length > 2000) break;
    content += character;
  }
  return {
    content,
    allowed_mentions: {
      parse: everyone ? ['everyone'] : ([] as string[]),
      roles: roleId ? [roleId] : [],
      users: [] as string[],
      replied_user: false,
    },
    flags: live ? 0 : 4,
    ...(kickEmbed
      ? {
          embeds: [
            {
              color: 0x53fc18,
              author: {
                name: `🔴 [LIVE] ${neutralize(live.streamerName ?? identity.displayName)}`.slice(
                  0,
                  256,
                ),
                url: live.url,
                ...(kickImageUrl(live.profileImageUrl)
                  ? { icon_url: kickImageUrl(live.profileImageUrl)! }
                  : {}),
              },
              url: live.url,
              description: `**Stream title:** ${markdown(live.title)}`,
              fields: [
                {
                  name: 'Category',
                  value: markdown(live.categoryName || 'Category unavailable'),
                  inline: false,
                },
              ],
              ...(kickImageUrl(live.categoryImageUrl)
                ? { thumbnail: { url: kickImageUrl(live.categoryImageUrl)! } }
                : {}),
              ...(kickImageUrl(live.thumbnailUrl)
                ? { image: { url: kickImageUrl(live.thumbnailUrl)! } }
                : {}),
              footer: { text: 'Kick • Live' },
            },
          ],
          components: [
            {
              type: 1 as const,
              components: [
                {
                  type: 2 as const,
                  style: 5 as const,
                  label: 'Watch on Kick',
                  emoji: { name: '🔗' },
                  url: live.url,
                },
                {
                  type: 2 as const,
                  style: 5 as const,
                  label: 'Watch Stream',
                  emoji: { name: '▶️' },
                  url: live.url,
                },
              ],
            },
          ],
        }
      : {}),
    ...(youtubeEmbed
      ? {
          embeds: [
            {
              color: 0xff0000,
              author: { name: 'YouTube' },
              description: `**${markdown(identity.displayName)}**\n\n[🔴 ${markdown(live.title)}](${live.url})`,
              image: {
                url:
                  live.thumbnailUrl ??
                  `https://i.ytimg.com/vi/${new URL(live.url).searchParams.get('v')}/hqdefault.jpg`,
              },
            },
          ],
        }
      : {}),
  };
}
/** Dashboard-only sample. This function never sends and strips all mention permissions. */
export function renderKickPreview(
  config: NotificationConfig,
  identity: NotificationIdentity,
): NotificationMessage {
  const message = renderNotification(
    { ...config, roleId: null, mentionEveryone: false },
    { ...identity, provider: 'kick' },
    {
      sessionKey: 'sample-only',
      startedAt: '2026-01-01T00:00:00Z',
      title: 'Sample livestream title (test data)',
      url: identity.canonicalUrl,
      categoryName: 'VALORANT',
      streamerName: identity.displayName,
    },
  );
  return { ...message, content: '[NAVI PREVIEW — SAMPLE DATA]\n' + message.content };
}
export function readNotificationIdentity(input: unknown): NotificationIdentity {
  if (!input || typeof input !== 'object')
    throw new NotificationError(400, 'invalid_notification_identity');
  const value = input as Record<string, unknown>;
  if (
    (value.provider !== 'youtube' && value.provider !== 'kick') ||
    typeof value.displayName !== 'string' ||
    !value.displayName ||
    value.displayName.length > 300 ||
    typeof value.canonicalUrl !== 'string'
  )
    throw new NotificationError(400, 'invalid_notification_identity');
  const pattern =
    value.provider === 'youtube'
      ? /^https:\/\/www\.youtube\.com\/channel\/UC[A-Za-z0-9_-]{22}$/
      : /^https:\/\/kick\.com\/[A-Za-z0-9_-]{1,25}$/;
  if (!pattern.test(value.canonicalUrl))
    throw new NotificationError(400, 'invalid_notification_identity');
  return {
    provider: value.provider,
    displayName: value.displayName,
    canonicalUrl: value.canonicalUrl,
  };
}
