/** In-memory known-credential comparison only; never return/log these values to a report. */
export function secretCandidates(key: string, value: string | undefined): string[] {
  if (!value || value.length < 8) return [];
  if (!key.endsWith('_URL')) return [value];
  try {
    const url = new URL(value),
      password = url.password
        ? decodeURIComponent(url.password)
        : url.searchParams.get('password') || '';
    if (!password) return []; // A documented password-free local endpoint is not a credential.
    return password.length >= 8 ? [value, password] : [value];
  } catch {
    return [value];
  }
}
