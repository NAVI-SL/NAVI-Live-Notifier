'use client';
export default function ApplicationError({ reset }: { reset: () => void }) {
  return (
    <main className="panel empty-state">
      <p className="eyebrow">Connection interrupted</p>
      <h1>We could not load NAVI</h1>
      <p role="alert">
        Authentication or Discord may be temporarily unavailable. Wait a moment and try again.
      </p>
      <button type="button" onClick={reset}>
        Try again
      </button>
      <p>
        <a href="/login">Return to sign in</a>
      </p>
    </main>
  );
}
