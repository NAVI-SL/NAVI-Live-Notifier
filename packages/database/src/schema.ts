import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  uniqueIndex,
  check,
  foreignKey,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

// Better Auth's native schema; application/guild settings remain out of scope.
export const user = pgTable('auth_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: instant('created_at').notNull(),
  updatedAt: instant('updated_at').notNull(),
});
export const session = pgTable(
  'auth_session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: instant('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [
    index('auth_session_user_idx').on(table.userId),
    index('auth_session_expiry_idx').on(table.expiresAt),
  ],
);
export const account = pgTable(
  'auth_account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: instant('access_token_expires_at'),
    refreshTokenExpiresAt: instant('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [
    index('auth_account_user_idx').on(table.userId),
    uniqueIndex('auth_account_provider_identity_idx').on(table.providerId, table.accountId),
  ],
);
export const verification = pgTable(
  'auth_verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: instant('expires_at').notNull(),
    createdAt: instant('created_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
  },
  (table) => [index('auth_verification_identifier_idx').on(table.identifier)],
);

// Public platform identity is shared; guild subscription configuration is not.
export const providerChannels = pgTable(
  'provider_channels',
  {
    id: text('id').primaryKey(),
    provider: text('provider', { enum: ['youtube', 'kick'] }).notNull(),
    externalId: text('external_id').notNull(),
    displayName: text('display_name').notNull(),
    canonicalUrl: text('canonical_url').notNull(),
    verifiedAt: instant('verified_at').notNull(),
    expiresAt: instant('expires_at').notNull(),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('provider_channels_identity_idx').on(table.provider, table.externalId),
    index('provider_channels_expiry_idx').on(table.expiresAt),
    check('provider_channels_provider_check', sql`${table.provider} in ('youtube', 'kick')`),
    check('provider_channels_id_check', sql`length(${table.externalId}) between 1 and 128`),
  ],
);
export const streamerSubscriptions = pgTable(
  'streamer_subscriptions',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull(),
    providerChannelId: text('provider_channel_id')
      .notNull()
      .references(() => providerChannels.id, { onDelete: 'cascade' }),
    userIdentifier: text('user_identifier').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: instant('created_at').notNull().defaultNow(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('streamer_subscriptions_guild_source_idx').on(
      table.guildId,
      table.providerChannelId,
    ),
    uniqueIndex('streamer_subscriptions_guild_id_idx').on(table.guildId, table.id),
    index('streamer_subscriptions_source_idx').on(table.providerChannelId),
    check('streamer_subscriptions_guild_check', sql`${table.guildId} ~ '^[0-9]{17,20}$'`),
    check(
      'streamer_subscriptions_identifier_check',
      sql`length(${table.userIdentifier}) between 1 and 512`,
    ),
  ],
);

export const notificationSettings = pgTable(
  'notification_settings',
  {
    subscriptionId: text('subscription_id').primaryKey(),
    guildId: text('guild_id').notNull(),
    channelId: text('channel_id').notNull(),
    roleId: text('role_id'),
    mentionEveryone: boolean('mention_everyone').notNull().default(false),
    template: text('template').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    version: integer('version').notNull().default(1),
    updatedAt: instant('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.guildId, table.subscriptionId],
      foreignColumns: [streamerSubscriptions.guildId, streamerSubscriptions.id],
    }).onDelete('cascade'),
    index('notification_settings_guild_idx').on(table.guildId),
    check('notification_settings_channel_check', sql`${table.channelId} ~ '^[0-9]{17,20}$'`),
    check(
      'notification_settings_role_check',
      sql`${table.roleId} is null or ${table.roleId} ~ '^[0-9]{17,20}$'`,
    ),
    check(
      'notification_settings_template_check',
      sql`length(${table.template}) between 1 and 1500`,
    ),
    check('notification_settings_version_check', sql`${table.version} > 0`),
  ],
);
export const notificationTestAttempts = pgTable(
  'notification_test_attempts',
  {
    id: text('id').primaryKey(),
    guildId: text('guild_id').notNull(),
    requestId: text('request_id').notNull(),
    subscriptionId: text('subscription_id').notNull(),
    version: integer('version').notNull(),
    status: text('status', { enum: ['pending', 'sent', 'failed', 'uncertain'] }).notNull(),
    errorCode: text('error_code'),
    createdAt: instant('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('notification_test_guild_request_idx').on(table.guildId, table.requestId),
    index('notification_test_guild_created_idx').on(table.guildId, table.createdAt),
    check(
      'notification_test_status_check',
      sql`${table.status} in ('pending','sent','failed','uncertain')`,
    ),
  ],
);

// Phase 6 durable polling, verified webhook hints and delivery admission.
export const monitorSources = pgTable('monitor_sources', {
  sourceId: text('source_id')
    .primaryKey()
    .references(() => providerChannels.id, { onDelete: 'cascade' }),
  initialized: boolean('initialized').notNull().default(false),
  baselineAt: instant('baseline_at'),
  nextPoll: instant('next_poll').notNull().defaultNow(),
  discoverAfter: instant('discover_after').notNull().defaultNow(),
  candidates: jsonb('candidates').$type<string[]>().notNull().default([]),
  hintVersion: integer('hint_version').notNull().default(0),
  renewAfter: instant('renew_after').notNull().defaultNow(),
  upstreamId: text('upstream_id'),
  hubPending: boolean('hub_pending').notNull().default(false),
  hubExpires: instant('hub_expires'),
});
export const monitorSessions = pgTable('monitor_sessions', {
  id: text('id').primaryKey(),
  sourceId: text('source_id')
    .notNull()
    .references(() => providerChannels.id, { onDelete: 'cascade' }),
  startedAt: instant('started_at').notNull(),
  payload: jsonb('payload').$type<import('@navi/core').LiveNotification>(),
  createdAt: instant('created_at').notNull().defaultNow(),
});
export const liveDeliveries = pgTable(
  'live_deliveries',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => monitorSessions.id, { onDelete: 'cascade' }),
    subscriptionId: text('subscription_id').notNull(),
    guildId: text('guild_id').notNull(),
    channelId: text('channel_id').notNull(),
    settingsVersion: integer('settings_version').notNull(),
    status: text('status', {
      enum: ['pending', 'sending', 'sent', 'suppressed', 'failed', 'uncertain'],
    }).notNull(),
    errorCode: text('error_code'),
    attempts: integer('attempts').notNull().default(0),
    dueAt: instant('due_at').notNull().defaultNow(),
    updatedAt: instant('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('live_delivery_destination_once').on(
      table.sessionId,
      table.guildId,
      table.channelId,
    ),
    index('live_delivery_due_idx').on(table.status, table.dueAt),
    check('live_delivery_attempts_check', sql`${table.attempts} >= 0`),
    check('live_delivery_version_check', sql`${table.settingsVersion} > 0`),
    check(
      'live_delivery_status_check',
      sql`${table.status} in ('pending','sending','sent','suppressed','failed','uncertain')`,
    ),
  ],
);
export const monitorReceipts = pgTable('monitor_receipts', {
  id: text('id').primaryKey(),
  createdAt: instant('created_at').notNull().defaultNow(),
});
export const monitorLimits = pgTable('monitor_limits', {
  provider: text('provider').primaryKey(),
  day: text('day').notNull(),
  used: integer('used').notNull().default(0),
  blockedUntil: instant('blocked_until'),
});
