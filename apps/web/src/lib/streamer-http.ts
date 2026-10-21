import 'server-only';
import { getRuntime } from './runtime';
import { AppError, assertOrigin, errorResponse } from './errors';

async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new AppError(415, 'json_required');
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'invalid_body');
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 12_000) throw new AppError(413, 'body_too_large');
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch {
    throw new AppError(400, 'invalid_body');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new AppError(400, 'invalid_body');
  return parsed as Record<string, unknown>;
}
export async function streamerRequest(
  request: Request,
  guildId: string,
  action: 'list' | 'resolve' | 'add' | 'change' | 'remove',
  id = '',
) {
  try {
    const { streamers, environment } = getRuntime();
    if (action !== 'list') assertOrigin(request, environment.WEB_ORIGIN);
    let result: unknown = { success: true };
    if (action === 'list')
      result = { subscriptions: await streamers.list(request.headers, guildId) };
    else if (action === 'remove') await streamers.change(request.headers, guildId, id);
    else {
      const data = await body(request);
      if (action === 'resolve') {
        if (data.acceptPolicy !== true) throw new AppError(400, 'policy_required');
        result = await streamers.resolve(request.headers, guildId, data.platform, data.identifier);
      } else if (action === 'add') await streamers.add(request.headers, guildId, data.confirmation);
      else {
        if (typeof data.enabled !== 'boolean') throw new AppError(400, 'invalid_enabled');
        await streamers.change(request.headers, guildId, id, data.enabled);
      }
    }
    return Response.json(result, {
      status: action === 'add' ? 201 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
