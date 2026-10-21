import Link from 'next/link';
import { AuthButton } from '../../components/auth-buttons';
export default function AccessDenied() {
  return (
    <main>
      <h1>Access denied</h1>
      <p>Your Discord account or server permissions do not allow access.</p>
      <AuthButton logout />
      <p>
        <Link href="/dashboard">Back to your servers</Link>
      </p>
    </main>
  );
}
