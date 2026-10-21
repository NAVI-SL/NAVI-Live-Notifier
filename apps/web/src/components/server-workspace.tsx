import { GuildIcon } from './guild-icon';
import { installationLabel, sectionContent, type DashboardSection } from '../lib/dashboard-model';
import type { InstallationStatus } from '../lib/discord';
import type { ReactNode } from 'react';
export type ServerWorkspaceData = {
  guild: { id: string; name: string; icon: string | null };
  status: InstallationStatus;
};
export function InstallationBadge({ status }: { status: InstallationStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {installationLabel(status)}
    </span>
  );
}
export function ServerWorkspace({
  data,
  section,
  children,
}: {
  data: ServerWorkspaceData;
  section: DashboardSection;
  children?: ReactNode;
}) {
  const { guild, status } = data;
  return (
    <>
      <header className="workspace-heading">
        <div className="server-title">
          <GuildIcon {...guild} />
          <div>
            <p className="eyebrow">Server workspace</p>
            <h1>{guild.name}</h1>
            <p className="server-id">Server ID: {guild.id}</p>
          </div>
        </div>
        <InstallationBadge status={status} />
      </header>
      <div className={`connection-panel connection-${status}`} role="status">
        <div>
          <h2>
            {status === 'installed'
              ? 'Your bot is connected'
              : status === 'not_installed'
                ? 'Connect NAVI to this server'
                : 'We could not verify the bot connection'}
          </h2>
          <p>
            {status === 'installed'
              ? 'Installation verified with Discord. Automatic delivery also requires enabled settings and a running monitoring worker.'
              : status === 'not_installed'
                ? 'Install NAVI to prepare this server for notifications.'
                : 'The bot service or Discord may be unavailable. Try refreshing before installing again.'}
          </p>
        </div>
        <div className="actions">
          {status === 'not_installed' && (
            <form action={`/api/guilds/${guild.id}/install`} method="post">
              <button type="submit">Install NAVI</button>
            </form>
          )}
          <a
            className="button secondary"
            href={`/dashboard/${guild.id}${section === 'overview' ? '' : `/${section}`}`}
          >
            Refresh status
          </a>
        </div>
      </div>
      {children ??
        (section === 'overview' ? (
          <>
            <section aria-labelledby="overview-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Overview</p>
                  <h2 id="overview-title">A home for your community</h2>
                </div>
                <span className="muted">Setup in progress</span>
              </div>
              <div className="summary-grid">
                <article className="panel">
                  <span className="card-kicker">Discord connection</span>
                  <h3>{installationLabel(status)}</h3>
                  <p>
                    {status === 'installed'
                      ? 'Ready for the next setup steps.'
                      : 'Verify the bot connection to continue setup.'}
                  </p>
                </article>
                <article className="panel">
                  <span className="card-kicker">Streaming channels</span>
                  <h3>Channel registry</h3>
                  <p>Register YouTube and Kick channels. Monitoring requires a running worker.</p>
                  <a href={`/dashboard/${guild.id}/streaming-channels`}>
                    View streaming channels →
                  </a>
                </article>
                <article className="panel">
                  <span className="card-kicker">Notifications</span>
                  <h3>Configure delivery</h3>
                  <p>
                    Configure destinations and send explicit tests. Worker status is not verified
                    here.
                  </p>
                  <a href={`/dashboard/${guild.id}/notifications`}>View notifications →</a>
                </article>
              </div>
            </section>
            <section className="panel next-step">
              <span className="card-kicker">Your next step</span>
              <h2>
                {status === 'installed'
                  ? 'Your Discord connection is ready'
                  : 'Start with the bot connection'}
              </h2>
              <p>
                {status === 'installed'
                  ? 'Register streaming channels, configure destinations and start the independent monitoring worker.'
                  : 'Confirm NAVI is installed on this server. Your account must retain Manage Server or Administrator permission.'}
              </p>
            </section>
          </>
        ) : (
          <section className="panel empty-state" aria-labelledby="section-title">
            <p className="eyebrow">{sectionContent[section].title}</p>
            <h2 id="section-title">{sectionContent[section].heading}</h2>
            <p>{sectionContent[section].description}</p>
            {section === 'settings' && (
              <dl className="server-facts">
                <div>
                  <dt>Server</dt>
                  <dd>{guild.name}</dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd>Verified server manager</dd>
                </div>
                <div>
                  <dt>Bot connection</dt>
                  <dd>{installationLabel(status)}</dd>
                </div>
              </dl>
            )}
          </section>
        ))}
    </>
  );
}
