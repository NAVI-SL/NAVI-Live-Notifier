-- Run interactively as navi_owner after migrations; contains no credentials.
-- Create LOGIN roles separately with psql \password (never inline passwords in shell history).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE navi FROM PUBLIC;
GRANT CONNECT ON DATABASE navi TO navi_web, navi_worker;
GRANT USAGE ON SCHEMA public TO navi_web, navi_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  auth_user, auth_session, auth_account, auth_verification,
  provider_channels, streamer_subscriptions, notification_settings, notification_test_attempts
TO navi_web;
GRANT SELECT ON streamer_subscriptions, notification_settings TO navi_worker;
GRANT SELECT, UPDATE ON provider_channels TO navi_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  monitor_sources, monitor_sessions, monitor_receipts, monitor_limits, live_deliveries
TO navi_worker;
-- Re-run this reviewed grant file after additive migrations. Do not grant DDL,
-- role creation, superuser or auth table access to the worker.
