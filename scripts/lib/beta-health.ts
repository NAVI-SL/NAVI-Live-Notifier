export type ProbeState =
  'ok' | 'disabled' | 'unauthorized' | 'degraded' | 'unavailable' | 'invalid_response';
type Probe = { url: string; expected: string; secret?: string };

/** Read-only probes. Never return response text, URLs, headers or raw exceptions. */
export async function probeHealth(
  probe: Probe,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ProbeState> {
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
      return 'unauthorized';
    }
    if (!response.ok) {
      await response.body?.cancel();
      return response.status === 503 ? 'degraded' : 'unavailable';
    }
    const reader = response.body?.getReader();
    if (!reader) return 'invalid_response';
    let size = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 4096) return 'invalid_response';
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
      return 'invalid_response';
    }
    return body && typeof body === 'object' && 'status' in body && body.status === probe.expected
      ? 'ok'
      : 'invalid_response';
  } catch {
    return 'unavailable';
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
    probeHealth(
      { url: `${config.webOrigin}/api/health`, expected: 'initialized' },
      fetcher,
      signal,
    ),
    probeHealth(
      { url: `${config.botUrl}/internal/health`, expected: 'ok', secret: config.botSecret },
      fetcher,
      signal,
    ),
    config.monitoringEnabled
      ? probeHealth(
          {
            url: `http://127.0.0.1:${config.workerPort}/internal/health`,
            expected: 'ok',
            secret: config.workerSecret,
          },
          fetcher,
          signal,
        )
      : Promise.resolve('disabled' as const),
  ]);
  return {
    status: web === 'ok' && bot === 'ok' && worker === 'ok' ? 'ok' : 'degraded',
    services: { web, bot, worker },
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
  return (result: Awaited<ReturnType<typeof betaHealth>>) => {
    const fingerprint = [result.services.web, result.services.bot, result.services.worker].join(
      ':',
    );
    const changed = fingerprint !== previous;
    const recovered = previous !== undefined && result.status === 'ok' && changed;
    previous = fingerprint;
    if (!changed || (result.status === 'ok' && !recovered)) return null;
    return {
      event: recovered ? 'health_recovered' : 'health_alert',
      severity: recovered ? 'info' : 'error',
      status: result.status,
      services: { ...result.services },
      delivery: 'console_only',
    };
  };
}
