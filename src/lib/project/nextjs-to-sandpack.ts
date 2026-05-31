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
};

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
 * Sanitize a code file by removing/replacing Next.js-specific constructs
 */
function sanitizeCode(code: string): string {
  // Remove 'use client' / 'use server' directives (they're just strings, harmless but messy)
  let result = code.replace(/^['"]use (client|server)['"];?\s*\n?/gm, '');

  // Replace import 'next/...' with nothing (stubs are added as separate files)
  // We DON'T remove these — we provide stub files instead via aliases

  // Replace metadata exports (Next.js specific, not needed for preview)
  result = result.replace(/^export\s+(?:const|let)\s+metadata\s*=\s*\{[\s\S]*?\};\s*\n?/gm, '');

  // Replace generateMetadata function
  result = result.replace(/^export\s+(?:async\s+)?function\s+generateMetadata[\s\S]*?\}\s*\n?/gm, '');

  // Strip generateStaticParams
  result = result.replace(/^export\s+(?:async\s+)?function\s+generateStaticParams[\s\S]*?\}\s*\n?/gm, '');

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
/* Tailwind CSS via CDN for Sandpack preview */
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
}
`.trim();
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

  // Add Next.js stub files
  for (const [stubPath, stubCode] of Object.entries(NEXTJS_STUBS)) {
    // Convert 'next/link' → '/next/link.js' for Sandpack file-based resolution
    const sandpackPath = '/' + stubPath.replace(/\//g, '__') + '.js';
    result[sandpackPath] = { code: stubCode };
  }

  // Process each project file
  let hasAppPage = false;
  let appPageContent = '';
  let hasComponents = false;

  for (const [rawPath, file] of Object.entries(files)) {
    if (file.status === 'deleted') continue;

    const normalized = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
    const sanitized = sanitizeCode(file.content);

    // Detect deps from this file
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
          if (name !== 'next' && typeof version === 'string') {
            allDeps[name] = version;
          }
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

    // Handle globals.css — replace Tailwind directives with browser-safe CSS
    if (normalized === 'app/globals.css' || normalized === 'src/app/globals.css') {
      const browserCss = buildBrowserGlobals();
      result['/index.css'] = { code: browserCss };
      continue;
    }

    // Map src/components → /components
    const sandpackPath = '/' + normalized
      .replace(/^src\/app\//, 'app/')
      .replace(/^src\//, '');

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
        const sanitized = sanitizeCode(files[candidate].content);
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
