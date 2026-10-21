export default function Privacy() {
  return (
    <main className="policy-page">
      <p className="eyebrow">Personal development · 17 October 2026</p>
      <h1>Privacy notice</h1>
      <p>
        NAVI Live Notifier is currently a local development application operated by its owner, with
        access restricted to approved Discord accounts. This notice describes the implemented
        registration features.
      </p>
      <h2>Discord login</h2>
      <p>
        We retrieve your Discord identity and server memberships to verify which servers you may
        manage. PostgreSQL stores your account, session and encrypted Discord OAuth credentials. A
        session cookie is stored in your browser. Server permissions are checked with Discord when
        you access server data. Logout removes the current session; it does not delete your account
        or other sessions.
      </p>
      <h2>YouTube and Kick</h2>
      <p>
        This application uses YouTube API Services and Kick’s official API to look up public channel
        information. A lookup sends the identifier you enter to the selected platform. Confirmed
        registrations store the platform’s stable account ID, public channel name, channel URL, your
        original identifier, selected Discord server ID, enable preference and timestamps. Public
        channel identities are shared internally between servers; each server’s subscriptions remain
        separate. We do not request your Google or Kick login credentials, and do not access private
        YouTube or Kick account data.
      </p>
      <p>
        See the{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
          Google Privacy Policy
        </a>{' '}
        and{' '}
        <a href="https://kick.com/privacy-policy" target="_blank" rel="noreferrer">
          Kick Privacy Policy
        </a>{' '}
        for platform processing.
      </p>
      <h2>Use, sharing and deletion</h2>
      <p>
        Registered data is used to display your server’s channel registry and configure notification
        destinations, message templates, optional role IDs and enable preferences. Explicit test
        requests send a labelled sample message to the saved Discord channel and may mention the
        selected role. Test attempt IDs, settings versions, timestamps and safe result codes are
        retained for up to seven days under the cleanup procedure; message bodies and Discord
        message IDs are not stored in this test history. When enabled, the monitoring worker checks
        registered public channels through official APIs and authenticated webhooks, stores stream
        titles/URLs for at most 29 days under its cleanup procedure, and sends to enabled
        destinations. Hashed session keys and delivery outcomes persist while their shared source
        exists to prevent duplicates. Webhook receipt hashes expire after seven days. This
        application has no advertising or analytics integration. It does not sell registration data.
      </p>
      <p>
        Remove a subscription on Streaming Channels to delete that server’s registration. The shared
        identity is deleted when its last subscription is removed. Cached identities expire after 29
        days without a new confirmed lookup; their subscriptions and entered identifiers are deleted
        together by the cleanup operation. Expired entries are hidden immediately on reads. Physical
        deletion requires an application request or the owner’s maintenance command; the owner must
        run cleanup daily while retaining real platform data, including when the web application is
        stopped.
      </p>
      <p>
        The local operator handles account deletion and removal of credentials, sessions, server
        registrations and database backups. Contact the owner who granted dashboard access; for this
        personal stage, the owner and tester are the same person. Backup expiry and cleanup must
        also be maintained by that operator. No public signup or external hosting is configured.
      </p>
      <p>
        <a href="/terms">Terms of use</a> · <a href="/dashboard">Return to dashboard</a>
      </p>
    </main>
  );
}
