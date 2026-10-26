-- REVIEW ONLY. Run as the approved migration owner in the approved target database.
-- Existing distinct restricted LOGIN roles must be created separately; never inline passwords.
-- psql --set=web_role=navi_web --set=bot_command_role=navi_command_bot --file=deployment/command-permissions.sql
-- Missing variables cause an error before any change. This file is never run at startup.
\set ON_ERROR_STOP on
SELECT current_database() AS navi_target_database \gset
-- BEGIN NAVI COMMAND GRANTS
BEGIN;
-- Abort before grants if identities are shared, administrative or own this invocation.
SELECT 1 / CASE WHEN :'web_role' <> :'bot_command_role'
  AND current_user NOT IN (:'web_role', :'bot_command_role')
  AND (SELECT count(*)=2 AND bool_and(NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls))
       FROM pg_roles WHERE rolname IN (:'web_role', :'bot_command_role'))
  THEN 1 ELSE 0 END AS runtime_role_guard;
GRANT CONNECT ON DATABASE :"navi_target_database" TO :"web_role", :"bot_command_role";
GRANT USAGE ON SCHEMA public TO :"web_role", :"bot_command_role";
REVOKE ALL ON public.bot_commands, public.bot_command_attempts, public.bot_guild_snapshots FROM :"web_role", :"bot_command_role";
GRANT SELECT, INSERT ON public.bot_commands TO :"web_role";
GRANT SELECT ON public.bot_guild_snapshots TO :"web_role";
GRANT SELECT, UPDATE ON public.bot_commands, public.notification_test_attempts TO :"bot_command_role";
GRANT SELECT, INSERT, UPDATE ON public.bot_command_attempts, public.bot_guild_snapshots, public.notification_settings TO :"bot_command_role";
GRANT SELECT ON public.provider_channels, public.streamer_subscriptions TO :"bot_command_role";
GRANT UPDATE(id) ON public.provider_channels, public.streamer_subscriptions TO :"bot_command_role";
REVOKE ALL ON public.auth_user, public.auth_session, public.auth_account, public.auth_verification FROM :"bot_command_role";
GRANT EXECUTE ON FUNCTION public.navi_command_requester_valid(text,text,text) TO :"web_role", :"bot_command_role";
COMMIT;
-- END NAVI COMMAND GRANTS
-- Keep existing web auth/provider/settings/test grants for admission and immediate disable.
-- Keep worker grants unchanged. Never grant command claims or auth access to the worker.
-- Verify effective inherited privileges with inspectCommandDatabase; GRANT alone is not proof.
