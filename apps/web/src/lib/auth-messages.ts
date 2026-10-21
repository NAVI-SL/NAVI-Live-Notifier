// Shared public vocabulary only. Never display arbitrary provider/error descriptions.
const messages = {
  invalid_origin:
    'This page uses a different address from NAVI’s configured sign-in address. Return to the sign-in page and try again.',
  authentication_configuration:
    'Discord sign-in is not configured correctly on the server. Contact the NAVI operator.',
  authentication_database:
    'NAVI cannot access its sign-in database. Please try again after the service is restored.',
  account_not_allowed:
    'This Discord account is not approved for NAVI’s private beta. Contact the operator using the agreed private channel.',
  access_denied: 'Discord authorization was cancelled or denied. You can try again.',
  authentication_expired:
    'This sign-in attempt expired or could not be verified. Start a fresh Discord login.',
  authentication_rate_limited:
    'Sign-in is temporarily rate limited. Please wait before trying again.',
  authentication_oauth:
    'Discord could not complete sign-in. Start again; if it persists, contact the operator to check the OAuth configuration.',
  authentication_unavailable:
    'NAVI’s authentication service is temporarily unavailable. Please try again shortly.',
  authentication_network:
    'Unable to reach NAVI’s sign-in service. Check your connection and try again.',
};
export type AuthFailureCode = keyof typeof messages;
export function authFailureCode(value: unknown): AuthFailureCode {
  const code = typeof value === 'string' ? value.toLowerCase() : '';
  if (Object.hasOwn(messages, code)) return code as AuthFailureCode;
  if (
    [
      'state_not_found',
      'state_mismatch',
      'state_cookie_mismatch',
      'state_expired',
      'invalid_state',
      'invalid_state_cookie',
      'state_verification_failed',
    ].includes(code)
  )
    return 'authentication_expired';
  if (['too_many_requests', 'rate_limited'].includes(code)) return 'authentication_rate_limited';
  return 'authentication_oauth';
}
export function authFailureMessage(value: unknown) {
  return messages[authFailureCode(value)];
}
