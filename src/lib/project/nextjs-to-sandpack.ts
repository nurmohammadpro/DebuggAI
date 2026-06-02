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

  // We DON'T remove `next/*` imports. Instead we provide compatible stubs under
  // `/node_modules/next/**` so Sandpack can resolve them.

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
/* Tailwind CSS is loaded via CDN <script> in the preview pane */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

body {
  background: white;
  color: #111827;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
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
