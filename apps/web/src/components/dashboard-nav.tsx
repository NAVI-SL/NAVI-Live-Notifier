'use client';
import { usePathname } from 'next/navigation';
import { dashboardNavigation } from '../lib/dashboard-model';
export function DashboardNav() {
  const path = usePathname();
  return (
    <nav className="dashboard-navigation" aria-label="Dashboard">
      <a
        className={path === '/dashboard' ? 'nav-item active' : 'nav-item'}
        href="/dashboard"
        aria-current={path === '/dashboard' ? 'page' : undefined}
      >
        <span aria-hidden="true">▦</span> Your servers
      </a>
      <p className="nav-label">Server workspace</p>
      {dashboardNavigation(path).map((item) =>
        item.href ? (
          <a
            key={item.key}
            className={`nav-item${item.active ? ' active' : ''}`}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
          >
            {item.label}
          </a>
        ) : (
          <span key={item.key} className="nav-item unavailable" aria-disabled="true">
            {item.label}
          </span>
        ),
      )}
    </nav>
  );
}
