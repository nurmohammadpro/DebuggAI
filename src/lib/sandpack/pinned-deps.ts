/**
 * Pinned dependency versions for Sandpack CDN caching.
 *
 * Sandpack fetches packages from CDN (jsdelivr/UNPKG). When every project uses
 * 'latest', the CDN must resolve the version on every request and cannot serve
 * cached bundles across projects. Pinning exact versions lets the CDN serve
 * pre-bundled packages instantly, cutting initial load from 5-10s to <1s.
 *
 * Versions are sourced from the project's own package.json and the Docker-path
 * COMMON_DEPENDENCIES map in package-normalizer.ts.
 */

const PINNED: Record<string, string> = {
  // ── UI primitives (shadcn dependencies) ──────────────────────────────────
  '@radix-ui/react-slot': '1.2.4',
  '@radix-ui/react-dialog': '1.1.4',
  '@radix-ui/react-dropdown-menu': '2.1.4',
  '@radix-ui/react-tooltip': '1.1.6',
  '@radix-ui/react-tabs': '1.1.2',
  '@radix-ui/react-sheet': '1.1.2',
  '@radix-ui/react-avatar': '1.1.1',
  '@radix-ui/react-checkbox': '1.1.3',
  '@radix-ui/react-label': '2.1.1',
  '@radix-ui/react-select': '2.1.4',
  '@radix-ui/react-separator': '1.1.1',
  '@radix-ui/react-switch': '1.1.2',

  // ── Styling ──────────────────────────────────────────────────────────────
  'class-variance-authority': '0.7.1',
  clsx: '2.1.1',
  'tailwind-merge': '3.4.0',

  // ── Icons ────────────────────────────────────────────────────────────────
  'lucide-react': '0.552.0',

  // ── Animation ────────────────────────────────────────────────────────────
  'framer-motion': '12.23.24',

  // ── Charts ───────────────────────────────────────────────────────────────
  recharts: '3.4.1',

  // ── Utilities ─────────────────────────────────────────────────────────────
  'date-fns': '4.1.0',
  'react-day-picker': '9.4.4',
  zod: '3.24.1',
  'react-hook-form': '7.54.2',
  '@hookform/resolvers': '3.9.1',

  // ── Data fetching / server state ─────────────────────────────────────────
  '@tanstack/react-query': '5.99.0',
  axios: '1.15.0',

  // ── Notifications ────────────────────────────────────────────────────────
  sonner: '2.0.7',

  // ── Markdown / content ───────────────────────────────────────────────────
  'react-markdown': '10.1.0',
  'remark-gfm': '4.0.1',
  'rehype-highlight': '7.0.2',

  // ── Misc commonly used ───────────────────────────────────────────────────
  'react-dropzone': '14.3.5',
  'react-resizable-panels': '4.11.2',
  'cmdk': '1.1.1',
  'vaul': '1.1.2',
};

/**
 * Returns the pinned version for a package, or `'latest'` if unknown.
 * The returned string is passed directly to Sandpack's `customSetup.dependencies`.
 */
export function getPinnedVersion(pkg: string): string {
  return PINNED[pkg] || 'latest';
}

export { PINNED };
