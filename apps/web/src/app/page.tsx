import { PROJECT_NAME } from '@navi/core';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <p className="eyebrow">Local development</p>
      <h1>{PROJECT_NAME}</h1>
      <p>Connect your Discord community.</p>
      <p>Sign in to choose a server, install NAVI and configure livestream notifications.</p>
      <Link href="/login">Login with Discord</Link>
      <p>
        <Link href="/login">Add to Discord</Link> · Approved beta access only.
      </p>
      <p>
        <Link href="/support">Beta support and feedback</Link>
      </p>
    </main>
  );
}
