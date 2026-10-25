export type ProbeState =
  'ok' | 'disabled' | 'unauthorized' | 'degraded' | 'unavailable' | 'invalid_response';
type Probe = { url: string; expected: string; secret?: string };
export type ProbeResult = {
  status: ProbeState;
  reason:
    | 'healthy'
    | 'connection_refused'
    | 'timeout'
    | 'dns_failure'
    | 'network_error'
    | 'unauthorized'
    | 'dependency_unready'
    | 'http_error'
    | 'invalid_response';
  httpStatus?: number;
};

/** Map only allowlisted codes; never serialize errors, URLs or their causes. */
function connectionReason(error: unknown, depth = 0): ProbeResult['reason'] {
  if (!error || typeof error !== 'object' || depth > 3) return 'network_error';
  const value = error as { name?: string; code?: string; cause?: unknown; errors?: unknown[] };
  if (value.code === 'ECONNREFUSED') return 'connection_refused';
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(value.code ?? '')) return 'dns_failure';
  if (
    ['TimeoutError', 'AbortError'].includes(value.name ?? '') ||
    ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(value.code ?? '')
  )
    return 'timeout';
  for (const cause of [
    value.cause,
    ...(Array.isArray(value.errors) ? value.errors.slice(0, 4) : []),
  ]) {
    const reason = connectionReason(cause, depth + 1);
    if (reason !== 'network_error') return reason;
  }
  return 'network_error';
}

/** Read-only probes. Never return response text, URLs, headers or raw exceptions. */
export async function probeHealthResult(
  probe: Probe,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ProbeResult> {
  try {
    const deadline = AbortSignal.timeout(5000);
    const response = await fetcher(probe.url, {
      redirect: 'error',
      cache: 'no-store',
      signal: signal ? AbortSignal.any([deadline, signal]) : deadline,
      headers: probe.secret ? { Authorization: `Bearer ${probe.secret}` } : {},
    });
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      return { status: 'unauthorized', reason: 'unauthorized', httpStatus: response.status };
    }
    if (!response.ok) {
      await response.body?.cancel();
      return {
        status: response.status === 503 ? 'degraded' : 'unavailable',
        reason: response.status === 503 ? 'dependency_unready' : 'http_error',
        httpStatus: response.status,
      };
    }
    const reader = response.body?.getReader();
    const invalid: ProbeResult = {
      status: 'invalid_response',
      reason: 'invalid_response',
      httpStatus: response.status,
    };
    if (!reader) return invalid;
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 4096) return invalid;
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return invalid;
    }
    return body && typeof body === 'object' && 'status' in body && body.status === probe.expected
      ? { status: 'ok', reason: 'healthy', httpStatus: response.status }
      : invalid;
  } catch (error) {
    return { status: 'unavailable', reason: connectionReason(error) };
  }
}

export async function probeHealth(
  probe: Probe,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
) {
  return (await probeHealthResult(probe, fetcher, signal)).status;
}

/** Private read-only readiness check. Public website health remains liveness-only. */
export async function probeAuthDatabase(query: (sql: string) => Promise<unknown>) {
  try {
    await query('SELECT 1 FROM auth_user, auth_session, auth_account, auth_verification LIMIT 0');
    return { status: 'ok', reason: 'auth_schema_accessible' } as const;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    const reason =
      code === '42P01'
        ? 'auth_schema_missing'
        : code === '42501'
          ? 'database_permission_denied'
          : ['28P01', '28000'].includes(String(code))
            ? 'database_authentication_failed'
            : connectionReason(error);
    return { status: 'degraded', reason } as const;
  }
}

export async function betaHealth(
  config: {
    webOrigin: string;
    botUrl: string;
    botSecret: string;
    workerPort: number;
    workerSecret: string;
    monitoringEnabled: boolean;
  },
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
) {
  const [web, bot, worker] = await Promise.all([
    probeHealthResult(
      { url: `${config.webOrigin}/api/health`, expected: 'initialized' },
      fetcher,
      signal,
    ),
    probeHealthResult(
      { url: `${config.botUrl}/internal/health`, expected: 'ok', secret: config.botSecret },
      fetcher,
      signal,
    ),
    config.monitoringEnabled
      ? probeHealthResult(
          {
            url: `http://127.0.0.1:${config.workerPort}/internal/health`,
            expected: 'ok',
            secret: config.workerSecret,
          },
          fetcher,
          signal,
        )
      : Promise.resolve({ status: 'disabled', reason: 'monitoring_disabled' } as const),
  ]);
  return {
    status:
      web.status === 'ok' && bot.status === 'ok' && worker.status === 'ok' ? 'ok' : 'degraded',
    services: { web: web.status, bot: bot.status, worker: worker.status },
    checks: {
      web: { kind: 'liveness', ...web },
      bot: { kind: 'readiness', ...bot },
      worker: { kind: 'readiness', ...worker },
    },
  } as const;
}

export function healthOptions(args: string[]) {
  let samples = 1,
    intervalSeconds = 60;
  const seen = new Set<string>();
  for (const arg of args) {
    const match = /^--(samples|interval-seconds)=(\d+)$/.exec(arg);
    if (!match || seen.has(match[1]!)) throw new Error('Invalid monitor options.');
    seen.add(match[1]!);
    const value = Number(match[2]);
    if (match[1] === 'samples') samples = value;
    else intervalSeconds = value;
  }
  if (
    !Number.isSafeInteger(samples) ||
    samples < 1 ||
    samples > 1440 ||
    intervalSeconds < 10 ||
    intervalSeconds > 3600
  )
    throw new Error('Invalid monitor options.');
  return { samples, intervalSeconds };
}

/** Console-only transition alerts: no network sender, credentials or response bodies. */
export function createHealthAlerts() {
  let previous: string | undefined;
  return (
    result: Pick<Awaited<ReturnType<typeof betaHealth>>, 'status' | 'services'> & {
      database?: { status: string };
    },
  ) => {
    const fingerprint = [
      result.status,
      result.services.web,
      result.services.bot,
      result.services.worker,
      result.database?.status,
    ].join(':');
    const changed = fingerprint !== previous;
    const recovered = previous !== undefined && result.status === 'ok' && changed;
    previous = fingerprint;
    if (!changed || (result.status === 'ok' && !recovered)) return null;
    return {
      event: recovered ? 'health_recovered' : 'health_alert',
      severity: recovered ? 'info' : 'error',
      status: result.status,
      services: { ...result.services },
      ...(result.database ? { database: { status: result.database.status } } : {}),
      delivery: 'console_only',
    };
  };
}
