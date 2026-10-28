import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/*': [
      'node_modules/sharp/**/*',
      'node_modules/@img/**/*',
      'node_modules/detect-libc/**/*',
    ],
  },
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    return [
      {
        source: '/((?!embed$).*)',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }],
      },
    ];
  },
};

export default nextConfig;
