'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  awaitCommand,
  CommandPendingError,
  prepareSubmission,
  finishSubmission,
  type CommandProgress,
} from '../lib/command-client';
import { CommandStatus } from './command-status';
export function InstallationRefresh({ guildId }: { guildId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [command, setCommand] = useState<CommandProgress | null>(null),
    [error, setError] = useState('');
  async function refresh() {
    setBusy(true);
    setError('');
    try {
      const url = `/api/guilds/${guildId}/commands`,
        submission = prepareSubmission(url, { kind: 'guild_status.refresh', payload: {} });
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': submission.key },
        body: JSON.stringify(submission.body),
        signal: AbortSignal.timeout(30000),
      });
      if (response.status !== 202) {
        if (response.status < 500) finishSubmission(url);
        throw new Error();
      }
      const accepted = await response.json();
      setCommand(accepted.command);
      finishSubmission(url);
      await awaitCommand(accepted.command, setCommand);
      setCommand(null);
      router.refresh();
    } catch (error) {
      if (error instanceof CommandPendingError) setCommand(error.command);
      setError(
        'Installation refresh has not been confirmed. Check the command status before retrying.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className="secondary"
        disabled={busy || command !== null}
        onClick={() => void refresh()}
      >
        Refresh status
      </button>
      {command && (
        <CommandStatus
          command={command}
          polling={busy}
          dismiss={() => {
            setCommand(null);
            setError('');
          }}
          complete={() => {
            setCommand(null);
            setError('');
            router.refresh();
          }}
        />
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
