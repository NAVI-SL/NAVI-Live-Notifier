export default function LoadingDashboard() {
  return (
    <section className="loading-state" role="status" aria-live="polite" aria-busy="true">
      <p className="eyebrow">NAVI workspace</p>
      <h1>Loading your server workspace…</h1>
      <p>Checking your Discord access and bot connection.</p>
      <div className="skeleton-grid" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
    </section>
  );
}
