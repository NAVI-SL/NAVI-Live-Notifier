'use client';
export default function DashboardError({ retry }: { retry: () => void }) {
  return (
    <section className="panel empty-state">
      <p className="eyebrow">Connection interrupted</p>
      <h1>Unable to load your workspace</h1>
      <p role="alert">
        A required service could not be reached or returned an error. Wait a moment, then try again.
      </p>
      <button type="button" onClick={retry}>
        Try again
      </button>
      <p>
        <a href="/dashboard">Return to your servers</a> · <a href="/login">Sign in again</a>
      </p>
    </section>
  );
}
