import { AppError } from './errors';
export async function json(request: Request): Promise<Record<string, unknown>> {
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
