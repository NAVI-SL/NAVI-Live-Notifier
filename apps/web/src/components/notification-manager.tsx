'use client';
import { useEffect, useState } from 'react';
import {
  DEFAULT_NOTIFICATION_TEMPLATE,
  normalizeNotificationMentions,
  renderKickPreview,
  type NotificationConfig,
  type NotificationTargets,
  type NotificationMessage,
} from '@navi/core';
import { KickEmbedPreview } from './kick-embed-preview';
import type { NotificationRow } from '@navi/database';
const messages: Record<string, string> = {
  login_required: 'Your session expired. Sign in again.',
  discord_reauthentication_required: 'Reconnect Discord before continuing.',
  guild_forbidden: 'You no longer have permission to manage this server.',
  account_not_allowed: 'This account cannot access the development dashboard.',
  bot_not_installed: 'NAVI is no longer installed. Reinstall the bot and refresh channels.',
  bot_missing_permissions:
    'The bot lacks access or required permissions. Check its roles and channel overwrites.',
  bot_missing_embed_permissions:
    'Grant NAVI Embed Links in the destination channel for rich livestream notifications.',
  everyone_mention_not_permitted:
    'NAVI needs Mention Everyone permission in this channel before @everyone can be enabled.',
  bot_unavailable: 'The bot service is unavailable. Start it and refresh channels.',
  discord_rate_limited: 'Discord is rate limited. Please wait.',
  notification_channel_unavailable:
    'This channel was deleted, is inaccessible, or is no longer writable. Choose an available text channel.',
  notification_role_unavailable:
    'This role was deleted, is managed, or is no longer mentionable. Choose another role or No mention.',
  invalid_notification_template:
    'Use 1–1500 characters. Do not include raw user/role mentions, @everyone or @here.',
  unsupported_template_variable:
    'Use only {streamer}, {platform}, {title} and {url}; braces must match.',
  notification_settings_changed:
    'Settings changed or were removed. Reload this page before trying again.',
  subscription_not_found: 'This registration was removed or expired. Return to Streaming Channels.',
  test_notification_rate_limited: 'Only one test per server is allowed every 30 seconds.',
  test_delivery_uncertain:
    'Delivery is uncertain. Check Discord before sending another test; another attempt could duplicate the message.',
  discord_request_rejected: 'Discord rejected the request. Check the channel and bot permissions.',
};
class RequestError extends Error {
  constructor(
    message: string,
    readonly retryAfter = 0,
  ) {
    super(message);
  }
}
const pendingTargets = new Map<string, Promise<NotificationTargets>>();
function targetsRequest(url: string) {
  const pending = pendingTargets.get(url);
  if (pending) return pending;
  const operation = request<NotificationTargets>(url).finally(() => {
    if (pendingTargets.get(url) === operation) pendingTargets.delete(url);
  });
  pendingTargets.set(url, operation);
  return operation;
}
async function request<T>(url: string, method = 'GET', data?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      ...(data === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    });
  } catch {
    throw new Error(
      'The request could not be confirmed. For a test send, check Discord before retrying.',
    );
  }
  const result = await response.json();
  if (!response.ok) {
    const retry = response.headers.get('retry-after');
    const seconds =
      retry && /^\d+(?:\.\d+)?$/.test(retry) ? Math.max(1, Math.ceil(Number(retry))) : 0;
    throw new RequestError(
      (messages[result.error] ?? 'The operation could not be completed. Refresh or try again.') +
        (seconds ? ` Retry in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.` : ''),
      seconds,
    );
  }
  return result as T;
}
export function NotificationManager({
  guildId,
  initial,
}: {
  guildId: string;
  initial: NotificationRow[];
}) {
  const [targets, setTargets] = useState<NotificationTargets>({ channels: [], roles: [] }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [refreshed, setRefreshed] = useState(false),
    [retryUntil, setRetryUntil] = useState(0);
  const endpoint = `/api/guilds/${guildId}/notifications`;
  async function refresh() {
    if (retryUntil > Date.now()) return;
    setLoading(true);
    setError('');
    setRefreshed(false);
    try {
      setTargets(await targetsRequest(endpoint + '/targets?fresh=1'));
      setRefreshed(true);
    } catch (error) {
      setTargets({ channels: [], roles: [] });
      setError(error instanceof Error ? error.message : 'Channel retrieval failed.');
      setRetryUntil(error instanceof RequestError ? Date.now() + error.retryAfter * 1000 : 0);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!retryUntil) return;
    const timer = setTimeout(() => setRetryUntil(0), Math.max(0, retryUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [retryUntil]);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setTargets({ channels: [], roles: [] });
    setRefreshed(false);
    setRetryUntil(0);
    targetsRequest(endpoint + '/targets').then(
      (data) => {
        if (mounted) {
          setTargets(data);
          setLoading(false);
        }
      },
      (error) => {
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Channel retrieval failed.');
          setRetryUntil(error instanceof RequestError ? Date.now() + error.retryAfter * 1000 : 0);
          setLoading(false);
        }
      },
    );
    return () => {
      mounted = false;
    };
  }, [endpoint]);
  return (
    <section aria-labelledby="notifications-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Notifications</p>
          <h2 id="notifications-title">Notification Settings</h2>
        </div>
        <div className="actions">
          <button
            className="secondary"
            disabled={loading || retryUntil > Date.now()}
            onClick={() => void refresh()}
          >
            Refresh channels and roles
          </button>
          <button
            className="secondary"
            disabled={loading || retryUntil > Date.now()}
            onClick={() => void refresh()}
          >
            Refresh permissions
          </button>
        </div>
      </div>
      <p className="registration-notice">
        Configure each YouTube or Kick registration independently. Automatic delivery requires an
        enabled, independently running monitoring worker. Preview uses sample data. Test sends a
        real, labelled Discord message and may mention the selected role, even when the saved
        notification preference is disabled.
      </p>
      {loading && <p role="status">Loading Discord text channels and roles…</p>}
      {refreshed && !loading && !error && (
        <p role="status">Permissions refreshed from Discord. Your selections were kept.</p>
      )}
      {error && (
        <p className="panel registration-error" role="alert">
          {error}{' '}
          {(error.includes('session expired') || error.includes('Reconnect Discord')) && (
            <a href="/login">Sign in</a>
          )}
        </p>
      )}
      {!loading && !error && !targets.channels.length && (
        <p className="panel" role="status">
          No writable text channels found. Grant NAVI View Channel and Send Messages in an ordinary
          text channel, then refresh.
        </p>
      )}
      {!initial.length ? (
        <div className="panel empty-state">
          <h3>No registered streamers</h3>
          <p>Register a YouTube or Kick account before configuring its destination.</p>
          <a href={`/dashboard/${guildId}/streaming-channels`}>Open Streaming Channels</a>
        </div>
      ) : (
        <div className="notification-list">
          {initial.map((row) => (
            <NotificationEditor
              key={row.subscriptionId}
              endpoint={`${endpoint}/${row.subscriptionId}`}
              initial={row}
              targets={targets}
              unavailable={loading || !!error}
            />
          ))}
        </div>
      )}
    </section>
  );
}
function NotificationEditor({
  endpoint,
  initial,
  targets,
  unavailable,
}: {
  endpoint: string;
  initial: NotificationRow;
  targets: NotificationTargets;
  unavailable: boolean;
}) {
  const [row, setRow] = useState({
    ...initial,
    config: initial.config ? normalizeNotificationMentions(initial.config) : null,
  });
  const [draft, setDraft] = useState<NotificationConfig>(
    initial.config
      ? normalizeNotificationMentions(initial.config)
      : {
          channelId: '',
          roleId: null,
          template: DEFAULT_NOTIFICATION_TEMPLATE,
          enabled: false,
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [preview, setPreview] = useState(''),
    [kickPreview, setKickPreview] = useState<NotificationMessage | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(row.config);
  const validChannel = targets.channels.some((channel) => channel.id === draft.channelId),
    validRole = draft.roleId === null || targets.roles.some((role) => role.id === draft.roleId);
  const canMentionEveryone = targets.channels.some(
    (channel) => channel.id === draft.channelId && channel.canMentionEveryone === true,
  );
  const mentionDenied = draft.mentionEveryone === true && validChannel && !canMentionEveryone;
  const ready = !unavailable && validChannel && validRole && !mentionDenied;
  function update(changes: Partial<NotificationConfig>) {
    setDraft(normalizeNotificationMentions({ ...draft, ...changes }));
    setPreview('');
    setKickPreview(null);
    setError('');
    setSuccess('');
  }
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await operation();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The operation failed.');
    } finally {
      setBusy(false);
    }
  }
  function saved(updated: NotificationRow) {
    setRow({ ...updated, config: normalizeNotificationMentions(updated.config!) });
    setDraft(normalizeNotificationMentions(updated.config!));
    setPreview('');
    setKickPreview(null);
    setSuccess('Settings saved. Automatic delivery requires the enabled monitoring worker.');
  }
  return (
    <article className="panel notification-editor" aria-busy={busy}>
      <span className="card-kicker">{row.provider === 'youtube' ? 'YouTube' : 'Kick'}</span>
      <h3>{row.displayName}</h3>
      <p className="muted">
        {row.config
          ? row.config.enabled
            ? 'Notification preference enabled'
            : 'Notifications disabled'
          : 'Not configured'}{' '}
        · Worker status not verified
      </p>
      {!row.subscriptionEnabled && (
        <p className="muted">
          The streamer subscription is disabled. Future automatic delivery will also require it to
          be enabled.
        </p>
      )}
      <label htmlFor={`${row.subscriptionId}-channel`}>Destination text channel</label>
      <select
        id={`${row.subscriptionId}-channel`}
        value={draft.channelId}
        disabled={busy || unavailable}
        onChange={(event) => update({ channelId: event.target.value })}
      >
        <option value="">Choose a text channel</option>
        {draft.channelId && !validChannel && (
          <option value={draft.channelId}>Saved channel unavailable ({draft.channelId})</option>
        )}
        {targets.channels.map((channel) => (
          <option key={channel.id} value={channel.id}>
            #{channel.name}
          </option>
        ))}
      </select>
      {!unavailable && draft.channelId && !validChannel && (
        <p className="registration-error">
          The saved channel is unavailable. Select a writable channel.
        </p>
      )}
      <label htmlFor={`${row.subscriptionId}-template`}>Notification message</label>
      <textarea
        id={`${row.subscriptionId}-template`}
        value={draft.template}
        rows={5}
        maxLength={1500}
        disabled={busy}
        onChange={(event) => update({ template: event.target.value })}
        aria-describedby={`${row.subscriptionId}-variables`}
      />
      <p id={`${row.subscriptionId}-variables`} className="muted">
        Variables: {'{streamer} {platform} {title} {url}'}. Plain-text previews are capped at
        Discord’s 2000-character message limit.
      </p>
      <label htmlFor={`${row.subscriptionId}-role`}>Optional role mention</label>
      <select
        id={`${row.subscriptionId}-role`}
        value={draft.mentionEveryone ? 'everyone' : (draft.roleId ?? '')}
        disabled={busy || unavailable}
        aria-describedby={`${row.subscriptionId}-mention-help${mentionDenied ? ` ${row.subscriptionId}-mention-permission` : ''}`}
        aria-invalid={mentionDenied}
        onChange={(event) =>
          update({
            roleId: event.target.value === 'everyone' ? null : event.target.value || null,
            mentionEveryone: event.target.value === 'everyone',
          })
        }
      >
        <option value="">No mention</option>
        <option value="everyone">@everyone</option>
        {draft.roleId && !validRole && (
          <option value={draft.roleId}>Saved role unavailable ({draft.roleId})</option>
        )}
        {targets.roles.map((role) => (
          <option key={role.id} value={role.id}>
            @{role.name}
          </option>
        ))}
      </select>
      <p className="muted" id={`${row.subscriptionId}-mention-help`}>
        Only current mentionable, unmanaged roles are eligible. Raw @everyone and @here in templates
        are blocked. Preview and test messages never ping @everyone.
      </p>
      {draft.mentionEveryone && (
        <p className="muted">
          @everyone can notify the entire server. Requires NAVI’s Mention Everyone permission in the
          destination channel.
        </p>
      )}
      {!unavailable && mentionDenied && (
        <div
          className="registration-error"
          role="alert"
          id={`${row.subscriptionId}-mention-permission`}
        >
          <p>
            NAVI lacks Mention Everyone permission in the selected channel. Save Settings is
            disabled because @everyone is selected.
          </p>
          <ol>
            <li>In Discord, open the destination channel’s Edit Channel → Permissions.</li>
            <li>
              Add or select NAVI Live Notifier (the bot member or its role), then allow “Mention
              @everyone, @here, and All Roles”. Save the change in Discord.
            </li>
            <li>
              Return here and select Refresh permissions above. Your chosen @everyone option will be
              kept.
            </li>
          </ol>
          <p>
            Only grant this permission to NAVI; Administrator is not needed. You can also choose No
            mention or an available role.
          </p>
        </div>
      )}
      {row.provider === 'youtube' && (
        <p className="muted">
          Automatic YouTube alerts include a red embed, linked stream title and thumbnail. NAVI
          needs Embed Links in the destination channel.
        </p>
      )}
      {row.provider === 'kick' && (
        <p className="muted">
          Automatic Kick alerts include a green embed, stream details and watch links. NAVI needs
          Embed Links in the destination channel.
        </p>
      )}
      <label className="policy-consent">
        <input
          type="checkbox"
          checked={draft.enabled}
          disabled={busy}
          onChange={(event) => update({ enabled: event.target.checked })}
        />{' '}
        Enable automatic notifications when the monitoring worker is running
      </label>
      <div className="actions">
        <button
          disabled={busy || !ready}
          onClick={() =>
            void run(async () =>
              saved(
                await request<NotificationRow>(endpoint, 'PUT', {
                  config: draft,
                  version: row.version,
                }),
              ),
            )
          }
        >
          Save settings
        </button>
        <button
          className="secondary"
          disabled={busy || !ready}
          onClick={() =>
            void run(async () => {
              const sample = await request<{ content: string; kick?: NotificationMessage }>(
                endpoint + '/preview',
                'POST',
                { config: draft },
              );
              setPreview(sample.content);
              // A text-only response from an already-running web process is still a validated preview.
              // Use the same pure sample formatter while processes are being restarted/upgraded.
              setKickPreview(
                row.provider === 'kick' ? (sample.kick ?? renderKickPreview(draft, row)) : null,
              );
            })
          }
        >
          Preview message
        </button>
        <button
          className="secondary"
          disabled={busy || !ready || dirty || !row.config}
          onClick={() =>
            void run(async () => {
              const result = await request<{ status: string; replayed: boolean }>(
                endpoint + '/test',
                'POST',
                { requestId: crypto.randomUUID(), version: row.version },
              );
              setSuccess(
                result.status === 'sent'
                  ? 'Test message accepted by Discord.'
                  : result.status === 'uncertain'
                    ? 'Previous delivery is uncertain. Check Discord before sending another test.'
                    : 'Previous test failed. Check the configuration before starting a new test.',
              );
            })
          }
        >
          Send test notification
        </button>
        {row.config?.enabled && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () =>
                saved(
                  await request<NotificationRow>(endpoint + '/disable', 'POST', {
                    version: row.version,
                  }),
                ),
              )
            }
          >
            Disable saved notifications
          </button>
        )}
      </div>
      {dirty && (
        <p className="muted">
          Save changes before sending a test. Tests always use the saved configuration.
        </p>
      )}
      {busy && <p role="status">Working…</p>}
      {error && (
        <p role="alert" className="registration-error">
          {error}
          {(error.includes('session expired') || error.includes('Reconnect Discord')) && (
            <>
              {' '}
              <a href="/login">Sign in</a>
            </>
          )}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      {preview && (
        <div className="notification-preview">
          <h4>Preview · sample data · no message sent</h4>
          <pre>{preview}</pre>
          {kickPreview && <KickEmbedPreview message={kickPreview} displayName={row.displayName} />}
        </div>
      )}
    </article>
  );
}
