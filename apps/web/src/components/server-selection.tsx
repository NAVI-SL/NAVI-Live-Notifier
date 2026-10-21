import { GuildIcon } from './guild-icon';
import { InstallationBadge, type ServerWorkspaceData } from './server-workspace';
export function ServerSelection({
  selection,
}: {
  selection: { servers: ServerWorkspaceData[]; total: number; page: number; pages: number };
}) {
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">Your workspace</p>
        <h1>Choose your server</h1>
        <p>Connect your community. Select a server to manage its NAVI workspace.</p>
      </header>
      <div className="section-heading">
        <h2>Your Discord servers</h2>
        <span className="muted">
          {selection.total} manageable {selection.total === 1 ? 'server' : 'servers'}
        </span>
      </div>
      {selection.servers.length ? (
        <div className="server-grid">
          {selection.servers.map(({ guild, status }) => (
            <a
              className="server-card"
              href={`/dashboard/${guild.id}`}
              key={guild.id}
              aria-label={`Open ${guild.name}`}
            >
              <GuildIcon {...guild} />
              <h3>{guild.name}</h3>
              <InstallationBadge status={status} />
              <span className="card-link">
                Open workspace <span aria-hidden="true">↗</span>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <section className="panel empty-state">
          <span className="empty-symbol" aria-hidden="true">
            ▦
          </span>
          <h2>No manageable servers found</h2>
          <p>
            You need to own a Discord server or have Manage Server or Administrator permission.
            Refresh after your permissions change.
          </p>
          <a className="button secondary" href="/dashboard">
            Refresh servers
          </a>
        </section>
      )}
      {selection.pages > 1 && (
        <nav className="pagination" aria-label="Server pages">
          {selection.page > 1 && (
            <a className="button secondary" href={`/dashboard?page=${selection.page - 1}`}>
              Previous
            </a>
          )}
          <span>
            Page {selection.page} of {selection.pages}
          </span>
          {selection.page < selection.pages && (
            <a className="button secondary" href={`/dashboard?page=${selection.page + 1}`}>
              Next
            </a>
          )}
        </nav>
      )}
      <p className="privacy-note">
        Only servers you own or can manage appear here. Discord permissions are checked again when
        you open a workspace.
      </p>
    </>
  );
}
