const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    // Remove if not using Server Components
    serverComponentsExternalPackages: ['mongodb'],
  },
  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000, // check every 2 seconds
        aggregateTimeout: 300, // wait before rebuilding
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return [
      {
        source: '/(.*)',
        headers: [
          // Security Headers
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: isDevelopment
              ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* https:;"
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
          },
          // CORS Headers (only for development or if explicitly configured)
          ...(isDevelopment || process.env.CORS_ORIGINS
            ? [
                {
                  key: 'Access-Control-Allow-Origin',
                  value: process.env.CORS_ORIGINS || '*',
                },
                {
                  key: 'Access-Control-Allow-Methods',
                  value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                },
                { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
                { key: 'Access-Control-Allow-Credentials', value: 'true' },
              ]
            : []),
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/external/:path*',
        destination: `${
          process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
        }/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
