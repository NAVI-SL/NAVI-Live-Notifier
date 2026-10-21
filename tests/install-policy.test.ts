import { describe, expect, it } from 'vitest';
import type { NextConfig } from 'next';

describe('native install form referrer policy', () => {
  it('keeps same-origin form origins on dashboard pages without sending cross-origin referrers', async () => {
    // Import the actual config; this test must fail if header order/scope regresses.
    const configPath = '../apps/web/next.config.mjs';
    const { default: config } = (await import(configPath)) as { default: NextConfig };
    const rules = await config.headers!();
    const policies = rules.flatMap((rule) =>
      rule.headers
        .filter((header) => header.key === 'Referrer-Policy')
        .map((header) => ({ source: rule.source, value: header.value })),
    );
    expect(policies).toEqual([
      { source: '/:path*', value: 'no-referrer' },
      { source: '/dashboard/:path*', value: 'same-origin' },
    ]);
  });
});
