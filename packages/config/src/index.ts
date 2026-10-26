import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse as parseDotenv } from 'dotenv';
import { z } from 'zod';

type Environment = Record<string, string | undefined>;

// This package is server-only. Never import it into a client component.
export type EnvironmentService = 'web' | 'bot' | 'worker' | 'database';
const environmentKeys = {
  web: [
    'NODE_ENV',
    'LOG_LEVEL',
    'WEB_ORIGIN',
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_ALLOWED_USER_IDS',
    'BETA_GUILD_IDS',
    'BOT_INTERNAL_URL',
    'BOT_INTERNAL_SECRET',
    'BOT_COMMAND_TRANSPORT',
    'BOT_COMMAND_ADMISSION_ENABLED',
    'YOUTUBE_API_KEY',
    'KICK_CLIENT_ID',
    'KICK_CLIENT_SECRET',
    'STREAMER_SOURCE_LIMIT',
  ],
  bot: [
    'NODE_ENV',
    'LOG_LEVEL',
    'DISCORD_BOT_TOKEN',
    'BOT_INTERNAL_SECRET',
    'BOT_STATUS_PORT',
    'BOT_COMMANDS_ENABLED',
    'DATABASE_URL',
    'DISCORD_ALLOWED_USER_IDS',
    'BETA_GUILD_IDS',
  ],
  worker: [
    'NODE_ENV',
    'LOG_LEVEL',
    'DATABASE_URL',
    'REDIS_URL',
    'MONITORING_ENABLED',
    'BOT_INTERNAL_URL',
    'BOT_INTERNAL_SECRET',
    'YOUTUBE_API_KEY',
    'KICK_CLIENT_ID',
    'KICK_CLIENT_SECRET',
    'MONITOR_PUBLIC_ORIGIN',
    'MONITOR_WEBHOOK_SECRET',
    'MONITOR_PORT',
    'YOUTUBE_DAILY_BUDGET',
    'BETA_GUILD_IDS',
  ],
  database: ['DATABASE_URL'],
} satisfies Record<EnvironmentService, string[]>;

/** Select service configuration without populating process.env with other services' secrets. */
export function loadRootEnvironment(service: EnvironmentService = 'database'): Environment {
  const files: Environment = {};
  for (const filename of ['.env', `.env.${service}`, process.env.NAVI_ENV_FILE].filter(
    (value): value is string => Boolean(value),
  )) {
    try {
      Object.assign(
        files,
        parseDotenv(
          readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../..', filename)),
        ),
      );
    } catch (error) {
      if (
        filename === process.env.NAVI_ENV_FILE ||
        !(error instanceof Error && 'code' in error && error.code === 'ENOENT')
      )
        // eslint-disable-next-line preserve-caught-error -- Keep raw configuration errors outside the public error boundary.
        throw new Error('Unable to read the repository environment file.');
    }
  }
  return Object.fromEntries(
    environmentKeys[service].map((key) => [key, process.env[key] ?? files[key]]),
  );
}

const common = {
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
};

const urlWithProtocol = (protocols: string[]) =>
  z
    .string()
    .url()
    .refine((value) => {
      try {
        return protocols.includes(new URL(value).protocol);
      } catch {
        return false;
      }
    });

const databaseUrl = urlWithProtocol(['postgres:', 'postgresql:']);
const redisUrl = urlWithProtocol(['redis:', 'rediss:']);
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);
const origin = urlWithProtocol(['http:', 'https:']).refine((value) => {
  try {
    const parsed = new URL(value);
    return parsed.origin === value && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
});
const snowflake = z.string().regex(/^\d{17,20}$/);
// Optional for existing owner-only development; configured beta scope is fail closed.
// The cap includes internal test guilds too, keeping external admission at most five.
const betaGuilds = z.preprocess(
  (value) => (value === undefined || value === '' ? undefined : value),
  z
    .string()
    .transform((value) => value.split(',').map((id) => id.trim()))
    .pipe(z.array(snowflake).min(1).max(5))
    .refine((ids) => new Set(ids).size === ids.length)
    .optional(),
);
const internalUrl = urlWithProtocol(['http:']).refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.hostname === '127.0.0.1' &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
});

function parse<T>(schema: z.ZodType<T>, input: Environment): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Report field names only: URLs and validation inputs may contain credentials.
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid environment variables: ${fields.join(', ')}`);
  }
  return result.data;
}

export function readWebEnvironment(input: Environment = process.env) {
  return parse(
    z.object({
      ...common,
      WEB_ORIGIN: origin.default('http://localhost:3000'),
    }),
    input,
  );
}

export function readBotEnvironment(input: Environment = process.env) {
  return parse(
    z.object({
      ...common,
      DISCORD_BOT_TOKEN: z.preprocess(
        (value) => (value === '' ? undefined : value),
        z.string().trim().min(1).optional(),
      ),
      BOT_INTERNAL_SECRET: optionalString,
      BOT_STATUS_PORT: z.coerce.number().int().min(1024).max(65535).default(4001),
    }),
    input,
  );
}

export function readAuthEnvironment(input: Environment = process.env) {
  return parse(
    z
      .object({
        ...common,
        WEB_ORIGIN: origin,
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_SECRET: z.string().min(32),
        DISCORD_CLIENT_ID: snowflake,
        DISCORD_CLIENT_SECRET: z.string().min(1),
        BETA_GUILD_IDS: betaGuilds,
        DISCORD_ALLOWED_USER_IDS: z
          .string()
          .transform((value) => value.split(',').map((id) => id.trim()))
          .pipe(z.array(snowflake).min(1)),
        BOT_INTERNAL_URL: internalUrl.default('http://127.0.0.1:4001'),
        BOT_INTERNAL_SECRET: z.string().default(''),
        BOT_COMMAND_TRANSPORT: z.enum(['http', 'postgres']).default('http'),
        BOT_COMMAND_ADMISSION_ENABLED: z
          .enum(['true', 'false'])
          .default('true')
          .transform((value) => value === 'true'),
      })
      .refine(
        (value) => value.BOT_COMMAND_TRANSPORT !== 'http' || value.BOT_INTERNAL_SECRET.length >= 32,
        { path: ['BOT_INTERNAL_SECRET'] },
      )
      .refine(
        (value) =>
          value.BOT_COMMAND_TRANSPORT !== 'postgres' || Boolean(value.BETA_GUILD_IDS?.length),
        { path: ['BETA_GUILD_IDS'] },
      )
      .refine(
        (value) => value.NODE_ENV !== 'production' || value.WEB_ORIGIN.startsWith('https://'),
        { path: ['WEB_ORIGIN'] },
      ),
    input,
  );
}
export type AuthEnvironment = ReturnType<typeof readAuthEnvironment>;

/** Separate opt-in: legacy bot startup needs neither a DB identity nor queue scope. */
export function readBotCommandEnvironment(input: Environment = process.env) {
  const flag = parse(
    z.object({ BOT_COMMANDS_ENABLED: z.enum(['true', 'false']).default('false') }),
    input,
  );
  if (flag.BOT_COMMANDS_ENABLED === 'false') return { enabled: false as const };
  const value = parse(
    z
      .object({
        DATABASE_URL: databaseUrl,
        DISCORD_BOT_TOKEN: z.string().min(1),
        BETA_GUILD_IDS: betaGuilds,
        DISCORD_ALLOWED_USER_IDS: z
          .string()
          .transform((x) => x.split(',').map((id) => id.trim()))
          .pipe(z.array(snowflake).min(1)),
      })
      .refine((x) => Boolean(x.BETA_GUILD_IDS?.length), { path: ['BETA_GUILD_IDS'] }),
    input,
  );
  return {
    enabled: true as const,
    databaseUrl: value.DATABASE_URL,
    allowedUsers: value.DISCORD_ALLOWED_USER_IDS,
    allowedGuilds: value.BETA_GUILD_IDS!,
  };
}

export function readWorkerEnvironment(input: Environment = process.env) {
  return parse(z.object({ ...common, DATABASE_URL: databaseUrl, REDIS_URL: redisUrl }), input);
}
export function readMonitoringEnvironment(input: Environment = process.env) {
  return parse(
    z
      .object({
        MONITORING_ENABLED: z
          .enum(['true', 'false'])
          .default('false')
          .transform((x) => x === 'true'),
        BOT_INTERNAL_URL: internalUrl.default('http://127.0.0.1:4001'),
        BOT_INTERNAL_SECRET: optionalString,
        YOUTUBE_API_KEY: optionalString,
        KICK_CLIENT_ID: optionalString,
        KICK_CLIENT_SECRET: optionalString,
        MONITOR_PUBLIC_ORIGIN: z.preprocess(
          (x) => (x === '' ? undefined : x),
          origin.refine((x) => x.startsWith('https://')).optional(),
        ),
        MONITOR_WEBHOOK_SECRET: z.preprocess(
          (x) => (x === '' ? undefined : x),
          z.string().min(32).optional(),
        ),
        MONITOR_PORT: z.coerce.number().int().min(1024).max(65535).default(4100),
        YOUTUBE_DAILY_BUDGET: z.coerce.number().int().min(1).max(8000).default(7200),
        BETA_GUILD_IDS: betaGuilds,
      })
      .refine(
        (x) =>
          !x.MONITORING_ENABLED ||
          Boolean(x.BOT_INTERNAL_SECRET && x.BOT_INTERNAL_SECRET.length >= 32),
        { path: ['BOT_INTERNAL_SECRET'] },
      )
      .refine((x) => !x.MONITOR_PUBLIC_ORIGIN || Boolean(x.MONITOR_WEBHOOK_SECRET), {
        path: ['MONITOR_WEBHOOK_SECRET'],
      }),
    input,
  );
}
export type MonitoringEnvironment = ReturnType<typeof readMonitoringEnvironment>;

export function readDatabaseEnvironment(input: Environment = process.env) {
  return parse(z.object({ DATABASE_URL: databaseUrl }), input);
}

export function readStreamerEnvironment(input: Environment = process.env) {
  return parse(
    z.object({
      YOUTUBE_API_KEY: optionalString,
      KICK_CLIENT_ID: optionalString,
      KICK_CLIENT_SECRET: optionalString,
      STREAMER_SOURCE_LIMIT: z.preprocess(
        (value) => (value === '' ? undefined : value),
        z.coerce.number().int().min(1).max(100).default(10),
      ),
    }),
    input,
  );
}
