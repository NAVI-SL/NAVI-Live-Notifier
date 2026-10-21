import type { ReactNode } from 'react';
import { dashboardIdentity } from '../../lib/dashboard-data';
import { DashboardNav } from '../../components/dashboard-nav';
import { AuthButton } from '../../components/auth-buttons';
export const dynamic = 'force-dynamic';
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const identity = await dashboardIdentity();
  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#workspace">
        Skip to content
      </a>
      <aside className="dashboard-sidebar">
        <a className="brand" href="/dashboard">
          <span className="brand-mark" aria-hidden="true">
            N
          </span>
          <span>
            NAVI<span className="brand-caption">LIVE NOTIFIER</span>
          </span>
        </a>
        <DashboardNav />
        <div className="sidebar-account">
          <span className="account-avatar" aria-hidden="true">
            {identity.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{identity.name}</strong>
            <p>Personal workspace</p>
          </div>
          <AuthButton logout />
        </div>
      </aside>
      <div className="dashboard-body">
        <div className="dashboard-topbar">
          <span>
            <span className="live-mark" aria-hidden="true" /> Discord workspace
          </span>
          <span className="development-badge">Development</span>
        </div>
        <main id="workspace" className="dashboard-main">
          {children}
        </main>
        <footer className="dashboard-footer">
          NAVI Live Notifier <span>Built for your community.</span>
        </footer>
      </div>
    </div>
  );
}
