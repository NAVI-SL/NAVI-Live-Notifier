import { AuthButton } from '../../components/auth-buttons';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { loadRootEnvironment, readAuthEnvironment } from '@navi/config';
import { canonicalLoginUrl } from '../../lib/login-origin';
import { authFailureMessage } from '../../lib/auth-messages';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  let environment;
  try {
    environment = readAuthEnvironment(loadRootEnvironment('web'));
  } catch {
    /* Render only a safe configuration message. */
  }
  if (environment) {
    const canonical = canonicalLoginUrl(environment, (await headers()).get('host'));
    if (canonical) redirect(canonical);
  }
  const failure = !environment
    ? 'authentication_configuration'
    : Array.isArray(error)
      ? error.at(-1)
      : error;
  return (
    <main>
      <p className="eyebrow">NAVI Live Notifier</p>
      <h1>Your Discord servers, connected.</h1>
      <p>Sign in with your approved Discord account to manage bot installation.</p>
      {failure && <p role="alert">{authFailureMessage(failure)}</p>}
      {environment && <AuthButton />}
      <p>We request your Discord identity and server list. Your email is not requested.</p>
    </main>
  );
}
