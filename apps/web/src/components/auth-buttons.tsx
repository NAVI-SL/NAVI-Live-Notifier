'use client';
import { createAuthClient } from 'better-auth/react';
import { useState } from 'react';
import { authFailureMessage } from '../lib/auth-messages';
const client = createAuthClient();
export function AuthButton({ logout = false }: { logout?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function act() {
    setBusy(true);
    setError('');
    try {
      if (logout) {
        const response = await client.signOut();
        if (response.error) {
          setError(authFailureMessage(response.error.code));
          setBusy(false);
          return;
        }
        window.location.assign('/login');
      } else {
        const response = await client.signIn.social({
          provider: 'discord',
          callbackURL: '/dashboard',
        });
        if (response.error) {
          setError(authFailureMessage(response.error.code));
          setBusy(false);
        }
      }
    } catch {
      setError(authFailureMessage('authentication_network'));
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" disabled={busy} onClick={act}>
        {busy ? 'Please wait…' : logout ? 'Log out' : 'Login with Discord'}
      </button>
      {error && (
        <p role="alert">
          {error} <a href="/login">Return to sign-in</a>
        </p>
      )}
    </>
  );
}
