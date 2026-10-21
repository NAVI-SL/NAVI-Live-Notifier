import { loadRootEnvironment, readWebEnvironment } from '@navi/config';

readWebEnvironment(loadRootEnvironment('web'));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['@navi/config', '@navi/database'],
  logging: { incomingRequests: false },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        source: '/dashboard/:path*',
        // Native install form POSTs need their same-origin Origin header.
        // Cross-origin navigation to Discord still sends no Referer.
        headers: [{ key: 'Referrer-Policy', value: 'same-origin' }],
      },
    ];
  },
  transpilePackages: ['@navi/core'],
};

export default config;
