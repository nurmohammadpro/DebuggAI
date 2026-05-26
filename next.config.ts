import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Docker-friendly builds. Produces `.next/standalone` for lean production images.
  output: "standalone",

  // Image optimization — allow remote images from Supabase and common CDNs.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },

  // Stable build ID so CDNs can cache assets across deployments.
  generateBuildId: async () => {
    return `debuggai-${process.env.npm_package_version || '0.1.0'}`;
  },

  // Security headers applied to all responses (defense-in-depth with middleware).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // Cache static assets aggressively (fingerprinted by Next.js)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache public pages at the CDN level for 5 minutes, stale-revalidate for 1 hour
        source: '/((?!api|dashboard|admin|preview|auth|monitoring).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=3600' },
        ],
      },
    ];
  },

  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-alert-dialog'],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  disableLogger: true,
  automaticVercelMonitors: true,
});
