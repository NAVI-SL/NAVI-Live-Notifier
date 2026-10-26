import 'server-only';
import { AppError, assertOrigin, errorResponse } from './errors';
import { getRuntime } from './runtime';
import { json } from './request-json';
import { commandAccepted } from './command-http';
export async function notificationRequest(
  request: Request,
  guildId: string,
  action: 'list' | 'targets' | 'save' | 'preview' | 'test' | 'disable',
  subscriptionId = '',
) {
  try {
    const { notifications, commands, environment } = getRuntime();
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
      if (commands && (action === 'save' || action === 'test')) {
        if (environment.BOT_COMMAND_ADMISSION_ENABLED === false)
          throw new AppError(503, 'command_admission_paused');
        const command = await commands.submit(
          request.headers,
          guildId,
          action === 'test'
            ? String(input.requestId ?? '')
            : (request.headers.get('idempotency-key') ?? ''),
          {
            kind: action === 'save' ? 'notification_settings.apply' : 'notification_test.send',
            payload: {
              subscriptionId,
              expectedVersion: input.version,
              ...(action === 'save' ? { config: input.config } : {}),
            },
          },
        );
        return commandAccepted(guildId, command);
      }
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
