import { isIP } from 'node:net';

/** Conservative DNS-host profile check, not DNS/TLS/reachability verification. */
export function isPublicHttpsOrigin(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      url.origin === value &&
      !url.username &&
      !url.password &&
      !isIP(host.replace(/^\[|\]$/g, '')) &&
      host.includes('.') &&
      !host.endsWith('.') &&
      !/(^|\.)(localhost|localdomain|local|internal|test|invalid|example)$/.test(host) &&
      !/(^|\.)example\.(com|org|net)$/.test(host)
    );
  } catch {
    return false;
  }
}
