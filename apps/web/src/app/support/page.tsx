import Link from 'next/link';

export default function Support() {
  return (
    <main className="policy-page">
      <p className="eyebrow">Controlled beta · not publicly activated</p>
      <h1>Support and feedback</h1>
      <p>
        Use the private support channel agreed with the operator who approved your beta access.
        Public support and data-deletion contact details have not yet been confirmed.
      </p>
      <p>
        For a bug report, include the affected feature, time and timezone, steps to reproduce,
        expected result, actual result and any visible safe error code. Redact personal information
        from screenshots. Report a security issue privately.
      </p>
      <p>
        Never send passwords, bot tokens, API keys, authorization codes, callback URLs or session
        cookies. If a notification result is uncertain, inspect Discord before retrying.
      </p>
      <p>
        For account or server-data deletion, contact the same approved operator privately. Logging
        out or removing the bot does not by itself erase all stored data.
      </p>
      <p>
        <Link href="/privacy">Privacy notice</Link> · <Link href="/terms">Terms</Link> ·{' '}
        <Link href="/dashboard">Dashboard</Link>
      </p>
    </main>
  );
}
