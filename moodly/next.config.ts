import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators:false,
  serverExternalPackages: ['postgres'],
  outputFileTracingIncludes: { '/*': ['./config/development.defaults.json','./supabase/certs/prod-ca-2021.crt'] },
  allowedDevOrigins: ['*.e2b.app', '*.app.github.dev', '*.githubpreview.dev', 'localhost', '127.0.0.1'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: { cpus: 2 },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};
export default config;
