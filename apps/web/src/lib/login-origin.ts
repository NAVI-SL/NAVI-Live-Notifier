/** Canonicalize only the development loopback login page, never trusted mutation origins. */
export function canonicalLoginUrl(
  environment: { NODE_ENV: string; WEB_ORIGIN: string },
  host: string | null,
) {
  if (environment.NODE_ENV !== 'development' || !host) return null;
  const origin = new URL(environment.WEB_ORIGIN);
  const port = origin.port ? `:${origin.port}` : '';
  const aliases = ['localhost', '127.0.0.1', '[::1]'].map((name) => `${name}${port}`);
  if (!aliases.includes(origin.host) || !aliases.includes(host) || host === origin.host)
    return null;
  return `${origin.origin}/login`;
}
