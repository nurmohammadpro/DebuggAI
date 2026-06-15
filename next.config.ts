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
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://api.openai.com https://api.anthropic.com https://api.deepseek.com https://api.groq.com blob:",
              "img-src 'self' data: https://*.supabase.co https://cdn.jsdelivr.net",
              "font-src 'self' data: https://fonts.gstatic.com",
              "worker-src blob:",
              "frame-src 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
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

  serverExternalPackages: ['esbuild'],
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
  // Removed disableLogger (→ webpack.treeshake.removeDebugLogging) and
  // automaticVercelMonitors (→ webpack.automaticVercelMonitors) because both
  // are webpack-only. This project uses Turbopack, which ignores them.
});
