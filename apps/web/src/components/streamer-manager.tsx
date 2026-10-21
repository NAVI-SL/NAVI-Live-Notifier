'use client';
import { useState, type FormEvent } from 'react';
import type { ResolvedStreamer, StreamerSubscription } from '@navi/database';

const messages: Record<string, string> = {
  invalid_streamer:
    'Enter a YouTube handle/channel URL or a Kick username/channel URL for the selected platform.',
  unsupported_youtube_url:
    'Use a YouTube @handle or /channel/UC… URL. Legacy /c/, /user/ and video URLs are not supported.',
  streamer_not_found: 'No public channel was found. Check the identifier and try again.',
  duplicate_subscription: 'This channel is already registered for this server.',
  confirmation_expired:
    'This confirmation has expired or belongs to another session. Resolve the channel again.',
  invalid_confirmation: 'Resolve the channel again before saving.',
  youtube_not_configured: 'YouTube lookup is not configured. Set the server-side YouTube API key.',
  kick_not_configured: 'Kick lookup is not configured. Set the server-side Kick app credentials.',
  platform_credentials_rejected:
    'The platform rejected the app credentials. Check the developer configuration.',
  platform_rate_limited: 'The platform is rate limited.',
  lookup_rate_limited: 'Too many lookups. Please wait before trying again.',
  youtube_quota_exhausted:
    'The YouTube project quota is exhausted. Check Google Cloud Console before retrying.',
  guild_forbidden: 'You no longer have permission to manage this server.',
  account_not_allowed: 'Your account no longer has access to this development dashboard.',
  login_required: 'Your session has expired. Sign in with Discord again.',
  discord_reauthentication_required: 'Reconnect your Discord account before continuing.',
  subscription_not_found: 'This subscription was removed. Refresh the list.',
  source_limit:
    'The configured development source limit has been reached. Remove an unused channel first.',
  policy_required: 'Review and accept the privacy notice and terms before looking up a channel.',
};
export function StreamerManager({
  guildId,
  initial,
}: {
  guildId: string;
  initial: StreamerSubscription[];
}) {
  const [platform, setPlatform] = useState('youtube');
  const [identifier, setIdentifier] = useState('');
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [subscriptions, setSubscriptions] = useState(initial);
  const [pending, setPending] = useState<{
    account: ResolvedStreamer;
    confirmation: string;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [refreshWarning, setRefreshWarning] = useState(''),
    [success, setSuccess] = useState('');
  const endpoint = `/api/guilds/${guildId}/streamers`;
  async function request<T>(url: string, method: string, data?: unknown): Promise<T> {
    const response = await fetch(url, {
      method,
      cache: 'no-store',
      credentials: 'same-origin',
      ...(data === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    });
    const result = await response.json();
    if (!response.ok) {
      const retry = response.headers.get('retry-after');
      throw new Error(
        (messages[result.error] ?? 'The operation failed. Please try again or refresh the page.') +
          (retry && /^\d+$/.test(retry) ? ` Retry in ${retry} seconds.` : ''),
      );
    }
    return result as T;
  }
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await operation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The operation failed. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setSubscriptions(
      (await request<{ subscriptions: StreamerSubscription[] }>(endpoint, 'GET')).subscriptions,
    );
    setRefreshWarning('');
  }
  async function refreshAfterCommit() {
    try {
      await refresh();
    } catch {
      setRefreshWarning(
        'Your change was saved, but the channel list could not be refreshed. Use Refresh list to load the latest settings; do not repeat the change.',
      );
    }
  }
  function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(null);
    void run(async () => {
      setPending(
        await request(endpoint + '/resolve', 'POST', { platform, identifier, acceptPolicy }),
      );
    });
  }
  function save() {
    void run(async () => {
      await request(endpoint, 'POST', { confirmation: pending?.confirmation });
      setPending(null);
      setIdentifier('');
      setSuccess('Channel registered. Configure notifications and run the monitoring worker.');
      await refreshAfterCommit();
    });
  }
  function change(subscription: StreamerSubscription, remove: boolean) {
    void run(async () => {
      await request(
        `${endpoint}/${subscription.id}`,
        remove ? 'DELETE' : 'PATCH',
        remove ? undefined : { enabled: !subscription.enabled },
      );
      setSuccess(
        remove
          ? 'Subscription removed from this server.'
          : 'Subscription preference updated. Worker status is not verified here.',
      );
      setSubscriptions((rows) =>
        remove
          ? rows.filter((row) => row.id !== subscription.id)
          : rows.map((row) =>
              row.id === subscription.id ? { ...row, enabled: !subscription.enabled } : row,
            ),
      );
      await refreshAfterCommit();
    });
  }
  return (
    <section aria-labelledby="streamers-title" aria-busy={busy}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Streaming Channels</p>
          <h2 id="streamers-title">Your channel registry</h2>
        </div>
        <button className="secondary" disabled={busy} onClick={() => void run(refresh)}>
          Refresh list
        </button>
      </div>
      <p className="registration-notice">
        Registration alone does not activate notifications. Enable a destination in Notifications
        and run the independent monitoring worker. Its live status is not verified here.
        Registrations without refreshed metadata expire after 29 days.
      </p>
      {refreshWarning && <p role="status">{refreshWarning}</p>}
      <form className="panel streamer-form" onSubmit={resolve}>
        <label htmlFor="streamer-platform">Platform</label>
        <select
          id="streamer-platform"
          value={platform}
          disabled={busy}
          onChange={(e) => {
            setPlatform(e.target.value);
            setPending(null);
            setError('');
            setSuccess('');
          }}
        >
          <option value="youtube">YouTube</option>
          <option value="kick">Kick</option>
        </select>
        <label htmlFor="streamer-identifier">
          {platform === 'youtube'
            ? 'YouTube handle or channel URL'
            : 'Kick username or channel URL'}
        </label>
        <input
          id="streamer-identifier"
          value={identifier}
          required
          maxLength={512}
          disabled={busy}
          placeholder={
            platform === 'youtube'
              ? '@channel or https://youtube.com/@channel'
              : 'username or https://kick.com/username'
          }
          onChange={(e) => {
            setIdentifier(e.target.value);
            setPending(null);
            setError('');
            setSuccess('');
          }}
          aria-describedby="streamer-help"
        />
        <p id="streamer-help" className="muted">
          Public accounts only. Lookup uses the platform’s official API.
        </p>
        <label className="policy-consent">
          <input
            type="checkbox"
            checked={acceptPolicy}
            required
            disabled={busy}
            onChange={(event) => setAcceptPolicy(event.target.checked)}
          />{' '}
          <span>
            I agree to the{' '}
            <a href="/privacy" target="_blank" rel="noreferrer">
              privacy notice
            </a>{' '}
            and{' '}
            <a href="/terms" target="_blank" rel="noreferrer">
              terms of use
            </a>
            , including the linked YouTube terms when using YouTube.
          </span>
        </label>
        <button disabled={busy || !identifier.trim() || !acceptPolicy} type="submit">
          {busy ? 'Working…' : 'Resolve channel'}
        </button>
      </form>
      {error && (
        <p className="registration-error panel" role="alert">
          {error} <a href="/login">Sign in</a>
        </p>
      )}
      {success && (
        <p className="panel" role="status">
          {success}
        </p>
      )}
      {pending && (
        <article className="panel confirmation">
          <p className="eyebrow">Confirm account</p>
          <h3>{pending.account.displayName}</h3>
          <dl className="streamer-details">
            <div>
              <dt>Platform</dt>
              <dd>{pending.account.provider === 'youtube' ? 'YouTube' : 'Kick'}</dd>
            </div>
            <div>
              <dt>Stable account ID</dt>
              <dd>{pending.account.externalId}</dd>
            </div>
            <div>
              <dt>You entered</dt>
              <dd>{pending.account.userIdentifier}</dd>
            </div>
          </dl>
          <a href={pending.account.canonicalUrl} target="_blank" rel="noreferrer">
            View platform channel ↗
          </a>
          <div className="actions">
            <button disabled={busy} onClick={save}>
              Confirm and register
            </button>
            <button className="secondary" disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </article>
      )}
      <div className="section-heading">
        <h3>Registered channels ({subscriptions.length})</h3>
        <span className="muted">Server-specific subscriptions</span>
      </div>
      {!subscriptions.length ? (
        <div className="panel empty-state">
          <h3>No channels registered</h3>
          <p>
            Resolve a YouTube or Kick account above, check its identity, then confirm registration.
          </p>
        </div>
      ) : (
        <ul className="streamer-list">
          {subscriptions.map((subscription) => (
            <li className="panel" key={subscription.id}>
              <div>
                <span className="card-kicker">
                  {subscription.provider === 'youtube' ? 'YouTube' : 'Kick'}
                </span>
                <h3>
                  <a href={subscription.canonicalUrl} target="_blank" rel="noreferrer">
                    {subscription.displayName} ↗
                  </a>
                </h3>
                <p className="streamer-id">ID: {subscription.externalId}</p>
                <p className="streamer-id">Entered: {subscription.userIdentifier}</p>
                <p>
                  {subscription.enabled ? 'Enabled subscription' : 'Disabled'} · Worker status not
                  verified
                </p>
              </div>
              <div className="actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => change(subscription, false)}
                  aria-label={`${subscription.enabled ? 'Disable' : 'Enable'} ${subscription.displayName}`}
                >
                  {subscription.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => change(subscription, true)}
                  aria-label={`Remove ${subscription.displayName}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
