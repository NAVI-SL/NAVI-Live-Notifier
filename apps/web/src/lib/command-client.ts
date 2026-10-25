export type CommandProgress = {
  id: string;
  status: string;
  statusUrl: string;
  errorCode?: string | null;
  retryAt?: number;
};
type Acknowledgment = {
  id: string;
  status: string;
  result?: unknown;
  errorCode?: string | null;
  retryAfterSeconds?: number;
};
export class CommandPendingError extends Error {
  constructor(readonly command: CommandProgress) {
    super(
      `Command ${command.id}: ${command.status}. Check its status before starting another action.`,
    );
  }
}
/** Bounded, GET-only recovery after acceptance. Never dispatch a replacement command. */
export async function awaitCommand<T>(
  command: CommandProgress,
  onProgress: (command: CommandProgress) => void = () => {},
  fetcher: typeof fetch = fetch,
  wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  if (!/^\/api\/guilds\/\d{17,20}\/commands\/[a-f\d-]{36}$/i.test(command.statusUrl))
    throw new Error('Invalid command acknowledgment.');
  let current = command;
  if ((current.retryAt ?? 0) > Date.now()) throw new CommandPendingError(current);
  for (let attempt = 0; attempt < 20; attempt++) {
    onProgress(current);
    let response: Response;
    let data: Acknowledgment;
    try {
      response = await fetcher(command.statusUrl, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        if (response.status === 429) {
          const seconds = Number(response.headers.get('retry-after'));
          current = {
            ...current,
            retryAt: Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 60) * 1000,
          };
          onProgress(current);
        }
        throw new Error();
      }
      data = (await response.json()) as Acknowledgment;
      if (
        data.id !== command.id ||
        ![
          'pending',
          'processing',
          'completed',
          'failed',
          'expired',
          'uncertain',
          'cancelled',
        ].includes(data.status)
      )
        throw new Error();
    } catch {
      throw new CommandPendingError(current);
    }
    current = { ...command, status: data.status, errorCode: data.errorCode ?? null };
    onProgress(current);
    if (data.status === 'completed') return data.result as T;
    if (['failed', 'expired', 'uncertain', 'cancelled'].includes(data.status))
      throw new CommandPendingError(current);
    const retry = Number(response.headers.get('retry-after'));
    const delay = Math.max(
      3000,
      Number.isFinite(retry) ? retry * 1000 : 0,
      (data.retryAfterSeconds ?? 0) * 1000,
    );
    if (delay > 120000) {
      current = { ...current, retryAt: Date.now() + delay };
      onProgress(current);
      throw new CommandPendingError(current);
    }
    await wait(delay);
  }
  throw new CommandPendingError(current);
}

const submissions = new Map<string, { signature: string; key: string; body: unknown }>();
/** Lost admission responses must replay the same key/body, including the original test nonce. */
export function prepareSubmission(url: string, body: unknown) {
  const signature = JSON.stringify(
    body && typeof body === 'object' ? { ...body, requestId: undefined } : body,
  );
  let previous = submissions.get(url);
  try {
    previous ??=
      JSON.parse(sessionStorage.getItem(`navi-submission:${url}`) ?? 'null') ?? undefined;
  } catch {
    /* In-memory recovery still works. */
  }
  if (previous && previous.signature !== signature)
    throw new Error(
      'A previous submission was not confirmed. Retry the original action before changing it.',
    );
  const value = previous ?? { signature, key: crypto.randomUUID(), body };
  submissions.set(url, value);
  try {
    sessionStorage.setItem(`navi-submission:${url}`, JSON.stringify(value));
  } catch {
    /* Never dispatch a second operation to repair storage. */
  }
  return value;
}
export function finishSubmission(url: string) {
  submissions.delete(url);
  try {
    sessionStorage.removeItem(`navi-submission:${url}`);
  } catch {
    /* Preserve the authoritative database record. */
  }
}
