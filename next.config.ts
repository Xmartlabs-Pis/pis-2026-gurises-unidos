import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
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
