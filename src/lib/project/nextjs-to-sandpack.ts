/**
 * Next.js → Sandpack Converter
 *
 * Sandpack runs an in-browser bundler (parcel-based). It cannot run:
 *  - Next.js App Router server components
 *  - 'use server' / 'use client' directives (the bundler ignores them fine, but
 *    next/* imports are unknown to Sandpack)
 *  - next/link, next/image, next/navigation, next/font, etc.
 *
 * This module converts the AI-generated Next.js project into a plain React
 * SPA that Sandpack CAN preview. It's purely a best-effort visual approximation.
 */

import type { VirtualProjectFiles } from './virtual-files';

export interface SandpackBundle {
  files: Record<string, { code: string }>;
  dependencies: Record<string, string>;
  template: 'react' | 'react-ts';
}

// Sandpack runs in the browser. Exclude Node-only and build-time dependencies that
// frequently appear in generated Next.js projects (Tailwind/PostCSS/etc.) and
// crash the in-browser bundler with missing Node builtins like `fs`.
const SANDBACK_BROWSER_BLOCKED_DEPS = new Set<string>([
  'next',
  'typescript',
  'eslint',
  'eslint-config-next',
  // Tailwind / PostCSS toolchain (Node-only)
  'tailwindcss',
  '@tailwindcss/postcss',
  'postcss',
  'autoprefixer',
  // Common transitive offenders when Tailwind/PostCSS slip in
  '@swc/helpers',
  'browserslist',
  'caniuse-lite',
]);

function shouldIncludeDepForSandpack(name: string): boolean {
  if (!name) return false;
  if (SANDBACK_BROWSER_BLOCKED_DEPS.has(name)) return false;
  if (name.startsWith('@types/')) return false;
  return true;
}

// Known Next.js packages that should be stubbed for Sandpack
const NEXTJS_STUBS: Record<string, string> = {
  'next/link': `
const Link = ({ href, children, className, ...rest }) => (
  <a href={href} className={className} {...rest}>{children}</a>
);
export default Link;
`,
  'next/image': `
const Image = ({ src, alt, width, height, className, fill, style, ...rest }) => (
  <img 
    src={src} 
    alt={alt || ''} 
    width={fill ? undefined : width} 
    height={fill ? undefined : height}
    className={className}
    style={fill ? { width: '100%', height: '100%', objectFit: 'cover', ...style } : style}
    {...rest} 
  />
);
export default Image;
`,
  'next/navigation': `
export const useRouter = () => ({
  push: (href) => { window.location.href = href; },
  replace: (href) => { window.location.href = href; },
  back: () => window.history.back(),
  forward: () => window.history.forward(),
  refresh: () => window.location.reload(),
  prefetch: () => {},
});
export const usePathname = () => window.location.pathname;
export const useSearchParams = () => new URLSearchParams(window.location.search);
export const useParams = () => ({});
export const redirect = (href) => { window.location.href = href; };
export const notFound = () => {};
`,
  'next/headers': `
export const headers = () => new Headers();
export const cookies = () => ({ get: () => null, set: () => {}, delete: () => {} });
`,
  'next/server': `
export class NextResponse {
  static json(data, init) {
    return new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json' } });
  }
  static redirect(url) {
    return new Response(null, { status: 302, headers: { Location: url } });
  }
  static next() { return new Response(); }
}
export class NextRequest extends Request {}
`,
  'next/font/google': `
export const Inter = () => ({ className: 'font-inter' });
export const Roboto = () => ({ className: 'font-roboto' });
export const Geist = () => ({ className: 'font-geist', variable: '--font-geist' });
export const Geist_Mono = () => ({ className: 'font-geist-mono', variable: '--font-geist-mono' });
`,
  'next/font/local': `
export default () => ({ className: 'font-custom', variable: '--font-custom' });
`,
  'next/dynamic': `
import React, { lazy, Suspense } from 'react';
const dynamic = (fn, opts) => {
  const Component = lazy(fn);
  return (props) => (
    <Suspense fallback={opts?.loading ? React.createElement(opts.loading) : <div>Loading...</div>}>
      <Component {...props} />
    </Suspense>
  );
};
export default dynamic;
`,
  'next/script': `
import React from 'react';
const Script = ({ src, strategy, onLoad, children, ...rest }) => {
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = src;
    script.async = strategy !== 'lazyOnload';
    if (onLoad) script.onload = onLoad;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [src]);
  return children ? <>{children}</> : null;
};
export default Script;
`,
  'next/head': `
import React from 'react';
const Head = ({ children }) => <>{children}</>;
export default Head;
export const defaultHead = () => null;
`,
  'next/amp': `
export const useAmp = () => false;
export const withAmp = (Component) => Component;
export const AMP_STATE = '__NEXT_AMP_INITED';
`,
};

// Stubs that contain JSX — must use .jsx so Sandpack parses them correctly.
const JSX_STUBS = new Set([
  'next/link',
  'next/image',
  'next/navigation',
  'next/dynamic',
  'next/script',
  'next/head',
  'next/amp',
  'next/font/google',
  'next/font/local',
]);

function toSandpackNodeModulesPath(moduleSpecifier: string): string {
  const clean = moduleSpecifier.replace(/^\//, '');
  const ext = JSX_STUBS.has(clean) ? '.jsx' : '.js';
  return `/node_modules/${clean}${ext}`;
}

// Common npm package versions known to work well in Sandpack
const KNOWN_VERSIONS: Record<string, string> = {
  'react': '^18.3.1',
  'react-dom': '^18.3.1',
  'react-router-dom': '^6.22.0',
  'react-hook-form': '^7.51.0',
  'framer-motion': '^11.0.8',
  'clsx': '^2.1.0',
  'tailwind-merge': '^2.2.2',
  'class-variance-authority': '^0.7.0',
  'lucide-react': '^0.363.0',
  'sonner': '^1.4.3',
  'zustand': '^4.5.2',
  'date-fns': '^3.3.1',
  'recharts': '^2.12.0',
  'zod': '^3.22.4',
  'axios': '^1.6.8',
  'react-icons': '^5.0.1',
  '@radix-ui/react-dialog': '^1.0.5',
  '@radix-ui/react-dropdown-menu': '^2.0.6',
  '@radix-ui/react-slot': '^1.0.2',
  '@radix-ui/react-tabs': '^1.0.4',
  '@radix-ui/react-toast': '^1.1.5',
  '@radix-ui/react-tooltip': '^1.0.7',
  '@radix-ui/react-select': '^2.0.0',
  '@radix-ui/react-popover': '^1.0.7',
  '@radix-ui/react-label': '^2.0.2',
  '@radix-ui/react-checkbox': '^1.0.4',
  '@radix-ui/react-switch': '^1.0.3',
  '@radix-ui/react-scroll-area': '^1.0.5',
  '@radix-ui/react-separator': '^1.0.3',
  '@radix-ui/react-avatar': '^1.0.4',
  '@radix-ui/react-badge': '^1.0.0',
  '@radix-ui/react-accordion': '^1.1.2',
  '@tanstack/react-query': '^5.28.0',
  'styled-components': '^6.1.8',
  '@emotion/react': '^11.11.4',
  '@emotion/styled': '^11.11.4',
  'uuid': '^9.0.1',
  'nanoid': '^5.0.5',
  'lodash': '^4.17.21',
  'lodash-es': '^4.17.21',
  'wouter': '^3.12.0',
  'react-hot-toast': '^2.4.1',
  'react-select': '^5.8.0',
  'react-dropzone': '^14.2.3',
};

/**
 * Rewrite @/ path alias imports to relative paths for Sandpack.
 * Next.js @/ maps to the project root (./ or src/), which in Sandpack
 * corresponds to the root filesystem (/).
 */
function rewriteAliasImports(code: string, sandpackPath: string): string {
  // Compute the relative path from this file's directory to the Sandpack root
  const dir = sandpackPath.includes('/') ? sandpackPath.substring(0, sandpackPath.lastIndexOf('/')) : '';
  const depth = dir.split('/').filter(Boolean).length;
  const relativeRoot = depth === 0 ? './' : '../'.repeat(depth);

  // Rewrite static imports: from '@/...'
  let result = code.replace(
    /from\s+['"]@\/([^'"]+)['"]/g,
    (_match, importPath) => `from '${relativeRoot}${importPath}'`
  );

  // Rewrite dynamic imports: import('@/...')
  result = result.replace(
    /import\s*\(\s*['"]@\/([^'"]+)['"]\s*\)/g,
    (_match, importPath) => `import('${relativeRoot}${importPath}')`
  );

  // Rewrite require: require('@/...')
  result = result.replace(
    /require\s*\(\s*['"]@\/([^'"]+)['"]\s*\)/g,
    (_match, importPath) => `require('${relativeRoot}${importPath}')`
  );

  return result;
}

/**
 * Sanitize a code file by removing/replacing Next.js-specific constructs
 */
function sanitizeCode(code: string, sandpackPath?: string): string {
  // Remove 'use client' / 'use server' directives (they're just strings, harmless but messy)
  let result = code.replace(/^['"]use (client|server)['"];?\s*\n?/gm, '');

  // Rewrite bare `next/*` imports to absolute `/node_modules/next/*` paths
  // so Sandpack's bundler can resolve them against our stub files.
  result = result.replace(/from\s+['"]next\/([^'"]+)['"]\s*/g, "from '/node_modules/next/$1' ");
  result = result.replace(/require\(['"]next\/([^'"]+)['"]\)/g, "require('/node_modules/next/$1')");

  // Replace metadata exports (Next.js specific, not needed for preview)
  result = result.replace(/^export\s+(?:const|let)\s+metadata\s*=\s*\{[\s\S]*?\};\s*\n?/gm, '');

  // Replace generateMetadata function
  result = result.replace(/^export\s+(?:async\s+)?function\s+generateMetadata[\s\S]*?\}\s*\n?/gm, '');

  // Strip generateStaticParams
  result = result.replace(/^export\s+(?:async\s+)?function\s+generateStaticParams[\s\S]*?\}\s*\n?/gm, '');

  // Rewrite @/ path alias imports to relative paths for Sandpack
  if (sandpackPath) {
    result = rewriteAliasImports(result, sandpackPath);
  }

  return result.trim();
}

/**
 * Detect npm dependencies from import statements in code
 */
function detectDepsFromCode(code: string): Record<string, string> {
  const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([@\w][\w./-]*)['"]/g;
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  const deps: Record<string, string> = {};

  for (const regex of [importRegex, requireRegex]) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(code)) !== null) {
      const dep = m[1];
      if (!dep || dep.startsWith('.') || dep.startsWith('/')) continue;

      // Handle scoped packages
      const parts = dep.split('/');
      const pkgName = dep.startsWith('@') && parts.length >= 2
        ? `${parts[0]}/${parts[1]}`
        : parts[0]!;

      if (!pkgName) continue;

      // Skip Next.js itself (we stub it)
      if (pkgName === 'next') continue;
      if (!shouldIncludeDepForSandpack(pkgName)) continue;

      deps[pkgName] = KNOWN_VERSIONS[pkgName] || 'latest';
    }
  }

  return deps;
}

/**
 * Build a Tailwind CSS CDN-injected globals.css that works in-browser
 */
function buildBrowserGlobals(): string {
  return `
/* Tailwind CSS — loaded from CDN via Sandpack externalResources */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; }

html, body, #root { height: 100%; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: white;
  color: #111827;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Fallback basic utility classes (when CDN is blocked) */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1 1 0%; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.w-full { width: 100%; }
.h-full { height: 100%; }
.min-h-screen { min-height: 100vh; }
.p-0 { padding: 0; }
.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.pt-4 { padding-top: 1rem; }
.pb-4 { padding-bottom: 1rem; }
.m-0 { margin: 0; }
.mx-auto { margin-left: auto; margin-right: auto; }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-8 { margin-bottom: 2rem; }
.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-full { border-radius: 9999px; }
.border { border-width: 1px; }
.border-2 { border-width: 2px; }
.border-t { border-top-width: 1px; }
.border-b { border-bottom-width: 1px; }
.overflow-hidden { overflow: hidden; }
.overflow-auto { overflow: auto; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.whitespace-nowrap { white-space: nowrap; }
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.font-black { font-weight: 900; }
.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.top-0 { top: 0; }
.left-0 { left: 0; }
.z-10 { z-index: 10; }
.z-50 { z-index: 50; }
.hidden { display: none; }
.block { display: block; }
.inline-block { display: inline-block; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.space-y-2 > * + * { margin-top: 0.5rem; }
.space-y-3 > * + * { margin-top: 0.75rem; }
.space-y-4 > * + * { margin-top: 1rem; }
.space-x-2 > * + * { margin-left: 0.5rem; }
.max-w-md { max-width: 28rem; }
.max-w-lg { max-width: 32rem; }
.max-w-xl { max-width: 36rem; }
.max-w-2xl { max-width: 42rem; }
.max-w-3xl { max-width: 48rem; }
.shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
.shadow { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1); }
.shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); }
.text-white { color: #fff; }
.text-black { color: #000; }
.text-gray-500 { color: #6b7280; }
.text-gray-700 { color: #374151; }
.text-gray-900 { color: #111827; }
.bg-white { background-color: #fff; }
.bg-black { background-color: #000; }
.bg-gray-50 { background-color: #f9fafb; }
.bg-gray-100 { background-color: #f3f4f6; }
.bg-gray-200 { background-color: #e5e7eb; }
.bg-gray-800 { background-color: #1f2937; }
.bg-gray-900 { background-color: #111827; }
.bg-zinc-900 { background-color: #18181b; }
.bg-zinc-950 { background-color: #09090b; }
.border-gray-200 { border-color: #e5e7eb; }
.border-gray-300 { border-color: #d1d5db; }
.text-zinc-400 { color: #a1a1aa; }
.text-zinc-500 { color: #71717a; }
.text-zinc-600 { color: #52525b; }
.bg-zinc-800 { background-color: #27272a; }
.hover\:bg-gray-100:hover { background-color: #f3f4f6; }
.transition-colors { transition-property: color, background-color, border-color; transition-duration: 150ms; }
.transition-all { transition-property: all; transition-duration: 150ms; }
.cursor-pointer { cursor: pointer; }
.select-none { user-select: none; }
.shrink-0 { flex-shrink: 0; }
`.trim();
}

/**
 * Strip Tailwind v4 directives that Sandpack's in-browser bundler can't process.
 * The Tailwind CDN (loaded via externalResources) handles utility classes at runtime.
 */
function sanitizeGlobalsCss(css: string): string {
  return css
    .replace(/@import\s+["']tailwindcss["']\s*;?\s*/g, '/* tailwindcss import stripped — using CDN */')
    .replace(/@tailwind\s+\w+\s*;?\s*/g, '/* @tailwind directive stripped — using CDN */')
    .replace(/@layer\s+\w+\s*\{/g, '/* @layer stripped — using CDN */\n')
    .replace(/@config\s+["'][^"']+["']\s*;?\s*/g, '/* @config stripped — using CDN */')
    .trim();
}

/**
 * Main converter: VirtualProjectFiles → SandpackBundle
 */
export function convertNextjsToSandpack(project: VirtualProjectFiles | null): SandpackBundle {
  const result: Record<string, { code: string }> = {};
  const allDeps: Record<string, string> = { react: '^18.3.1', 'react-dom': '^18.3.1' };

  if (!project || Object.keys(project.files).length === 0) {
    // Return a placeholder app
    result['/App.tsx'] = {
      code: `
import React from 'react';

export default function App() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      gap: '16px'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>✨ Ready to build</h1>
      <p style={{ opacity: 0.8, margin: 0 }}>Describe what you want to build in the chat →</p>
    </div>
  );
}
`.trim(),
    };
    return {
      files: result,
      dependencies: allDeps,
      template: 'react-ts',
    };
  }

  const files = project.files;
  const isTs = Object.keys(files).some((p) => p.endsWith('.ts') || p.endsWith('.tsx'));

  // Add Next.js stub files (as `/node_modules/next/**` so bare imports resolve)
  for (const [stubPath, stubCode] of Object.entries(NEXTJS_STUBS)) {
    const sandpackPath = toSandpackNodeModulesPath(stubPath);
    result[sandpackPath] = { code: stubCode.trim() };
  }

  // Process each project file
  let hasAppPage = false;
  let appPageContent = '';
  let hasComponents = false;

  for (const [rawPath, file] of Object.entries(files)) {
    if (file.status === 'deleted') continue;

    const normalized = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;

    // Pre-compute the Sandpack path so we can rewrite @/ path alias imports
    const sandpackPath = '/' + normalized
      .replace(/^src\/app\//, 'app/')
      .replace(/^src\//, '');

    // Handle CSS files BEFORE sanitizeCode (which is for JS/TS only)
    if (normalized === 'app/globals.css' || normalized === 'src/app/globals.css') {
      const cssContent = sanitizeGlobalsCss(file.content);
      result['/index.css'] = { code: cssContent || buildBrowserGlobals() };
      continue;
    }

    if (normalized.endsWith('.css')) {
      result[sandpackPath] = { code: sanitizeGlobalsCss(file.content) };
      continue;
    }

    const sanitized = sanitizeCode(file.content, sandpackPath);

    // Detect deps from this file (only npm packages, not @/ aliases or relative paths)
    const fileDeps = detectDepsFromCode(sanitized);
    Object.assign(allDeps, fileDeps);

    // Skip server-side API routes
    if (normalized.startsWith('app/api/') || normalized.startsWith('src/app/api/')) continue;

    // Skip Next.js config files that Sandpack doesn't need
    if (
      normalized === 'next.config.js' ||
      normalized === 'next.config.ts' ||
      normalized === 'next.config.mjs' ||
      normalized === 'postcss.config.js' ||
      normalized === 'postcss.config.mjs' ||
      normalized === 'tailwind.config.ts' ||
      normalized === 'tailwind.config.js' ||
      normalized === 'tsconfig.json'
    ) continue;

    // Handle package.json — extract deps only
    if (normalized === 'package.json') {
      try {
        const pkg = JSON.parse(sanitized);
        const pkgDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        for (const [name, version] of Object.entries(pkgDeps)) {
          if (typeof version !== 'string') continue;
          if (!shouldIncludeDepForSandpack(name)) continue;
          allDeps[name] = version;
        }
      } catch { /* ignore */ }
      continue;
    }

    // Map app/page.tsx → /App.tsx (the Sandpack entry)
    if (normalized === 'app/page.tsx' || normalized === 'app/page.jsx' || normalized === 'src/app/page.tsx') {
      hasAppPage = true;
      appPageContent = sanitized;
      result[isTs ? '/App.tsx' : '/App.jsx'] = { code: sanitized };
      continue;
    }

    // Skip layout (we synthesize our own index)
    if (
      normalized === 'app/layout.tsx' ||
      normalized === 'app/layout.jsx' ||
      normalized === 'src/app/layout.tsx'
    ) {
      // Extract CSS imports from layout
      const cssImports = (sanitized.match(/import\s+['"]([^'"]+\.css)['"]/g) || []).join('\n');
      if (cssImports) {
        result['/__layout_css_imports.js'] = { code: `// CSS imports from layout\n${cssImports}` };
      }
      continue;
    }

    // Map src/components → /components
    result[sandpackPath] = { code: sanitized };

    if (normalized.startsWith('components/') || normalized.startsWith('src/components/')) {
      hasComponents = true;
    }
  }

  // If no app/page.tsx was found, look for other entry points
  if (!hasAppPage) {
    const candidates = [
      'src/App.tsx', 'src/App.jsx', 'App.tsx', 'App.jsx',
      'src/App.js', 'App.js',
    ];
    for (const candidate of candidates) {
      if (files[candidate]) {
        const candidateSandpackPath = '/' + candidate.replace(/^src\//, '');
        const sanitized = sanitizeCode(files[candidate].content, candidateSandpackPath);
        result[isTs ? '/App.tsx' : '/App.jsx'] = { code: sanitized };
        appPageContent = sanitized;
        hasAppPage = true;
        break;
      }
    }
  }

  // Ensure we have an App file
  if (!result['/App.tsx'] && !result['/App.jsx']) {
    result['/App.tsx'] = {
      code: `
import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <h1>Preview</h1>
      <p>Your generated app will appear here after code is extracted.</p>
    </div>
  );
}
`.trim(),
    };
  }

  // Synthesize index.tsx entry point
  const ext = isTs ? 'tsx' : 'jsx';
  const AppImport = result['/App.tsx'] ? './App' : './App';

  result[`/index.${ext}`] = {
    code: `
import React from 'react';
import ReactDOM from 'react-dom/client';
${result['/index.css'] ? "import './index.css';" : ''}
import App from '${AppImport}';

const root = ReactDOM.createRoot(document.getElementById('root')${isTs ? ' as HTMLElement' : ''});
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`.trim(),
  };

  // Ensure we have a basic CSS reset if none exists
  if (!result['/index.css']) {
    result['/index.css'] = {
      code: buildBrowserGlobals(),
    };
  }

  return {
    files: result,
    dependencies: allDeps,
    template: isTs ? 'react-ts' : 'react',
  };
}
