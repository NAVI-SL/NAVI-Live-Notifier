import 'server-only';
import { AppError, assertOrigin, errorResponse } from './errors';
import { getRuntime } from './runtime';
async function json(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new AppError(415, 'json_required');
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'invalid_body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 12000) throw new AppError(413, 'body_too_large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  let data: unknown;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AppError(400, 'invalid_body');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new AppError(400, 'invalid_body');
  return data as Record<string, unknown>;
}
export async function notificationRequest(
  request: Request,
  guildId: string,
  action: 'list' | 'targets' | 'save' | 'preview' | 'test' | 'disable',
  subscriptionId = '',
) {
  try {
    const { notifications, environment } = getRuntime();
    let result: unknown;
    if (action === 'list')
      result = { subscriptions: await notifications.list(request.headers, guildId) };
    else if (action === 'targets')
      result = await notifications.targets(
        request.headers,
        guildId,
        new URL(request.url).searchParams.get('fresh') === '1',
      );
    else {
      assertOrigin(request, environment.WEB_ORIGIN);
      const input = await json(request);
      if (action === 'save')
        result = await notifications.save(
          request.headers,
          guildId,
          subscriptionId,
          input.config,
          input.version,
        );
      else if (action === 'preview')
        result = await notifications.preview(
          request.headers,
          guildId,
          subscriptionId,
          input.config,
        );
      else if (action === 'disable')
        result = await notifications.disable(
          request.headers,
          guildId,
          subscriptionId,
          input.version,
        );
      else
        result = await notifications.test(
          request.headers,
          guildId,
          subscriptionId,
          input.requestId,
          input.version,
        );
    }
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
