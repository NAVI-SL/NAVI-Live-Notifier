'use client';
import { useEffect, useState } from 'react';
import { awaitCommand, type CommandProgress } from '../lib/command-client';
export function CommandStatus({
  command,
  complete,
  dismiss,
  polling = false,
}: {
  command: CommandProgress;
  complete: (result: unknown) => void;
  dismiss?: () => void;
  polling?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [state, setState] = useState(command),
    [error, setError] = useState('');
  useEffect(() => setState(command), [command]);
  useEffect(() => {
    if (!state.retryAt) return;
    const timer = setTimeout(
      () => setState((current) => ({ ...current, retryAt: 0 })),
      Math.max(0, Math.min(2147483647, state.retryAt - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [state.retryAt]);
  return (
    <div role="status">
      <p>
        Command {state.id}: {state.status}. Acceptance does not mean completion.
        {state.errorCode ? ` Reason: ${state.errorCode}.` : ''}
        {(state.retryAt ?? 0) > Date.now() ? ' Waiting for the server retry window.' : ''}
      </p>
      <button
        className="secondary"
        disabled={busy || polling || (state.retryAt ?? 0) > Date.now()}
        onClick={() => {
          setBusy(true);
          setError('');
          void awaitCommand(state, setState)
            .then(complete)
            .catch(() =>
              setError(
                'Status not confirmed. No replacement was submitted. Uncertain sends require manual reconciliation.',
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        Check command status
      </button>
      {dismiss && ['failed', 'expired', 'cancelled'].includes(state.status) && (
        <button className="secondary" onClick={dismiss}>
          Dismiss terminal failure
        </button>
      )}
      {error && <p>{error}</p>}
    </div>
  );
}
