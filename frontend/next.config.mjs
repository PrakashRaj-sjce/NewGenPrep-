import 'dotenv/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for optimized cloud/Docker deployment (Removed for Vercel compatibility)
  // For Chrome Extension builds, use a separate build script with output: 'export'.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  productionBrowserSourceMaps: false,
  // Enable compression for better performance
  compress: true,
  // Power headers for SEO and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
