import type pg from 'pg';

/** Private read-only dependency/privilege probe; never claims or sends a command. */
export async function inspectCommandDatabase(pool: Pick<pg.Pool, 'query'>, profile: 'web' | 'bot') {
  try {
    const { rows } = await pool.query(
      `
      WITH required(relation, privilege, audience) AS (VALUES
        ('bot_commands','SELECT','both'), ('bot_commands','INSERT','web'), ('bot_commands','UPDATE','bot'),
        ('bot_guild_snapshots','SELECT','both'),('bot_guild_snapshots','INSERT','bot'),('bot_guild_snapshots','UPDATE','bot'),
        ('bot_command_attempts','SELECT','bot'),('bot_command_attempts','INSERT','bot'),('bot_command_attempts','UPDATE','bot'),
        ('notification_settings','SELECT','both'),('notification_settings','INSERT','bot'),('notification_settings','UPDATE','both'),
        ('notification_test_attempts','SELECT','both'),('notification_test_attempts','UPDATE','bot'),('notification_test_attempts','INSERT','web'),('notification_test_attempts','DELETE','web'),
        ('provider_channels','SELECT','both'),('streamer_subscriptions','SELECT','both')
      ), forbidden(relation, privilege, audience) AS (VALUES
        ('bot_commands','UPDATE','web'),('bot_commands','DELETE','both'),('bot_commands','TRUNCATE','both'),
        ('bot_command_attempts','SELECT','web'),('bot_command_attempts','INSERT','web'),('bot_command_attempts','UPDATE','web'),('bot_command_attempts','DELETE','both'),('bot_command_attempts','TRUNCATE','both'),
        ('bot_guild_snapshots','INSERT','web'),('bot_guild_snapshots','UPDATE','web'),('bot_guild_snapshots','DELETE','both'),('bot_guild_snapshots','TRUNCATE','both'),
        ('auth_user','SELECT','bot'),('auth_user','INSERT','bot'),('auth_user','UPDATE','bot'),('auth_user','DELETE','bot'),
        ('auth_session','SELECT','bot'),('auth_session','INSERT','bot'),('auth_session','UPDATE','bot'),('auth_session','DELETE','bot'),
        ('auth_account','SELECT','bot'),('auth_account','INSERT','bot'),('auth_account','UPDATE','bot'),('auth_account','DELETE','bot'),
        ('auth_verification','SELECT','bot'),('auth_verification','INSERT','bot'),('auth_verification','UPDATE','bot'),('auth_verification','DELETE','bot')
      )
      SELECT
        (SELECT NOT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls) FROM pg_roles WHERE rolname=current_user)
          AND NOT has_schema_privilege(current_user,'public','CREATE')
          AND NOT has_database_privilege(current_user,current_database(),'CREATE')
          AND NOT EXISTS(SELECT 1 FROM unnest(current_schemas(false)) AS active_schema WHERE active_schema NOT IN ('pg_catalog','public')) AS limited_role,
        (SELECT bool_and(has_table_privilege(current_user,'public.'||relation,privilege)) FROM required WHERE audience IN ('both',$1)) AS required_grants,
        (SELECT bool_and(NOT CASE WHEN privilege IN ('SELECT','INSERT','UPDATE') THEN has_any_column_privilege(current_user,'public.'||relation,privilege) ELSE has_table_privilege(current_user,'public.'||relation,privilege) END) FROM forbidden WHERE audience IN ('both',$1)) AS forbidden_grants_absent,
        has_function_privilege(current_user,'public.navi_command_requester_valid(text,text,text)','EXECUTE') AS identity_function,
        has_column_privilege(current_user,'public.provider_channels','id','UPDATE') AND has_column_privilege(current_user,'public.streamer_subscriptions','id','UPDATE') AS route_lock_grants`,
      [profile],
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    const checks = {
      limited_role: row?.limited_role === true,
      required_grants: row?.required_grants === true,
      forbidden_grants_absent: row?.forbidden_grants_absent === true,
      identity_function: row?.identity_function === true,
      route_lock_grants: row?.route_lock_grants === true,
    };
    return {
      status: Object.values(checks).every(Boolean) ? ('ok' as const) : ('degraded' as const),
      checks,
      consumerHeartbeatVerified: false as const,
    };
  } catch {
    return {
      status: 'degraded' as const,
      checks: { schema_or_permissions: false },
      consumerHeartbeatVerified: false as const,
    };
  }
}
