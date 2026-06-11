/**
 * Preview Compiler
 *
 * Bundles generated code (TSX/JSX) into a single JS bundle + CSS string
 * for in-browser preview rendering. Replaces the Docker sandbox for UI preview.
 *
 * - Uses esbuild (server-side) for fast TSX→JS compilation
 * - Strips Next.js-specific imports (next/navigation, next/link, next/image)
 * - Extracts CSS module files and converts to plain CSS
 * - Uses tiny React virtual modules backed by browser globals, avoiding
 *   CodeSandbox package fetches and serverless node_modules tracing issues.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import fsp from 'fs/promises';
import crypto from 'crypto';

const TMP_DIR = path.join(os.tmpdir(), 'debuggai-compile');
const REACT_GLOBAL_MODULES: Record<string, string> = {
  react: `
    const React = window.React;
    export default React;
    export const Children = React.Children;
    export const Component = React.Component;
    export const Fragment = React.Fragment;
    export const Profiler = React.Profiler;
    export const PureComponent = React.PureComponent;
    export const StrictMode = React.StrictMode;
    export const Suspense = React.Suspense;
    export const cloneElement = React.cloneElement;
    export const createContext = React.createContext;
    export const createElement = React.createElement;
    export const createRef = React.createRef;
    export const forwardRef = React.forwardRef;
    export const isValidElement = React.isValidElement;
    export const lazy = React.lazy;
    export const memo = React.memo;
    export const startTransition = React.startTransition;
    export const useCallback = React.useCallback;
    export const useContext = React.useContext;
    export const useDebugValue = React.useDebugValue;
    export const useDeferredValue = React.useDeferredValue;
    export const useEffect = React.useEffect;
    export const useId = React.useId;
    export const useImperativeHandle = React.useImperativeHandle;
    export const useInsertionEffect = React.useInsertionEffect;
    export const useLayoutEffect = React.useLayoutEffect;
    export const useMemo = React.useMemo;
    export const useReducer = React.useReducer;
    export const useRef = React.useRef;
    export const useState = React.useState;
    export const useSyncExternalStore = React.useSyncExternalStore;
    export const useTransition = React.useTransition;
  `,
  'react-dom': `
    const ReactDOM = window.ReactDOM;
    export default ReactDOM;
    export const createPortal = ReactDOM.createPortal;
    export const flushSync = ReactDOM.flushSync;
  `,
  'react-dom/client': `
    const ReactDOM = window.ReactDOM;
    export const createRoot = ReactDOM.createRoot;
    export const hydrateRoot = ReactDOM.hydrateRoot;
  `,
  'react/jsx-runtime': `
    const React = window.React;
    export const Fragment = React.Fragment;
    export function jsx(type, props, key) {
      return React.createElement(type, key === undefined ? props : { ...props, key });
    }
    export const jsxs = jsx;
  `,
  'react/jsx-dev-runtime': `
    const React = window.React;
    export const Fragment = React.Fragment;
    export function jsxDEV(type, props, key) {
      return React.createElement(type, key === undefined ? props : { ...props, key });
    }
  `,
};

// Next.js modules that get mock replacements in preview mode
const NEXT_MOCKS: Record<string, string> = {
  'next/navigation': `
    const noop = () => {};
    export const useRouter = () => ({
      push: noop, replace: noop, back: noop, forward: noop,
      refresh: noop, prefetch: noop,
      pathname: '/', query: {}, asPath: '/',
    });
    export const usePathname = () => '/';
    export const useSearchParams = () => new URLSearchParams();
    export const useParams = () => ({});
    export const redirect = (url) => { window.__debuggai_redirect = url; };
    export const notFound = noop;
    export const useSelectedLayoutSegment = () => null;
    export const useSelectedLayoutSegments = () => [];
    export default { useRouter, usePathname, useSearchParams, useParams, redirect, notFound };
  `,
  'next/link': `
    import React from 'react';
    export default function Link({ href, children, className, ...props }) {
      return React.createElement('a', { href, className, onClick: (e) => { e.preventDefault(); window.__debuggai_link = href; }, ...props }, children);
    }
  `,
  'next/image': `
    import React from 'react';
    export default function Image({ src, alt, className, width, height, style, ...props }) {
      return React.createElement('img', { src: src || '', alt: alt || '', className, width, height, style: { maxWidth: '100%', ...style }, ...props });
    }
  `,
  'next/head': `
    import React from 'react';
    export default function Head({ children }) { return null; }
    export function defaultHead() { return null; }
  `,
  'next/script': `
    import React from 'react';
    export default function Script(props) { return null; }
    export function initScriptLoader() {}
    export { default as Script } from 'next/script';
  `,
  'next/server': `
    export const NextResponse = { json: () => {}, redirect: () => {} };
    export const NextRequest = class {};
  `,
  '@supabase/ssr': `
    export const createServerClient = () => ({});
    export const createBrowserClient = () => ({});
  `,
  '@supabase/supabase-js': `
    export const createClient = () => ({});
  `,
};

// CSS module files get converted to plain CSS
function isCssModule(filePath: string) {
  return filePath.endsWith('.module.css') || filePath.endsWith('.module.scss') || filePath.endsWith('.module.sass');
}

/**
 * Bundle project files into a single JS string + CSS string for in-browser preview.
 */
export async function bundlePreview(
  files: Record<string, string>,
  entryPoint: string = 'app/page.tsx',
): Promise<{ js: string; css: string; errors: string[] }> {
  const errors: string[] = [];

  // Create a unique temp directory for each bundle
  const id = crypto.randomBytes(8).toString('hex');
  const workDir = path.join(TMP_DIR, id);
  await fsp.mkdir(workDir, { recursive: true });

  try {
    // Write all project files to the temp directory
    const cssChunks: string[] = [];

    for (const [filePath, content] of Object.entries(files)) {
      const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/g, '');
      const fullPath = path.join(workDir, normalized);

      // Check for directory traversal
      if (!fullPath.startsWith(workDir)) continue;

      await fsp.mkdir(path.dirname(fullPath), { recursive: true });

      // Extract CSS module content as plain CSS
      if (isCssModule(normalized)) {
        cssChunks.push(`/* ${normalized} */\n${content}`);
        // Write an empty module so imports don't break
        await fsp.writeFile(fullPath, 'export default {};', 'utf-8');
        continue;
      }

      // Handle regular CSS files
      if (normalized.endsWith('.css') && !normalized.endsWith('.module.css')) {
        cssChunks.push(`/* ${normalized} */\n${content}`);
        await fsp.writeFile(fullPath, content, 'utf-8');
        continue;
      }

      await fsp.writeFile(fullPath, content, 'utf-8');
    }

    // Determine the actual entry point
    const entryFull = path.join(workDir, entryPoint);
    let resolvedEntry: string | null = null;

    // Try several entry point patterns
    const entryCandidates = [
      entryFull,
      path.join(workDir, 'src', entryPoint),
      path.join(workDir, 'app/page.tsx'),
      path.join(workDir, 'src/app/page.tsx'),
      path.join(workDir, 'pages/index.tsx'),
      path.join(workDir, 'src/pages/index.tsx'),
      path.join(workDir, 'index.tsx'),
      path.join(workDir, 'App.tsx'),
      path.join(workDir, 'src/App.tsx'),
    ];

    for (const candidate of entryCandidates) {
      try {
        await fsp.access(candidate);
        resolvedEntry = candidate;
        break;
      } catch {
        // Try .jsx variants
        const jsxCandidate = candidate.replace(/\.tsx$/, '.jsx').replace(/\.ts$/, '.js');
        try {
          await fsp.access(jsxCandidate);
          resolvedEntry = jsxCandidate;
          break;
        } catch {
          continue;
        }
      }
    }

    if (!resolvedEntry) {
      // Fall back to the first .tsx/.jsx file found
      const allFiles = await findFiles(workDir);
      const tsxFiles = allFiles.filter(
        (f) => f.endsWith('.tsx') || f.endsWith('.jsx'),
      );
      if (tsxFiles.length > 0) {
        resolvedEntry = path.join(workDir, tsxFiles[0]);
      } else {
        return { js: '', css: '', errors: ['No entry point found'] };
      }
    }

    const entryImportPath = `./${path.relative(workDir, resolvedEntry).replace(/\\/g, '/')}`;
    const previewEntryPath = path.join(workDir, '__debuggai_preview_entry.tsx');
    await fsp.writeFile(
      previewEntryPath,
      [
        "import React from 'react';",
        "import { createRoot } from 'react-dom/client';",
        `import Page from ${JSON.stringify(entryImportPath)};`,
        '',
        "const rootElement = document.getElementById('root');",
        "if (!rootElement) throw new Error('Preview root element not found');",
        'createRoot(rootElement).render(',
        '  <React.StrictMode>',
        '    <Page />',
        '  </React.StrictMode>,',
        ');',
        '',
      ].join('\n'),
      'utf-8',
    );

    // Dynamic import esbuild (native binary, avoid Turbopack bundling)
    const esbuild = await import('esbuild');

    const plugins: Array<{ name: string; setup: (build: any) => void }> = [];

    // Mock Next.js modules
    plugins.push({
      name: 'next-mocks',
      setup(build: any) {
        for (const [module, mockCode] of Object.entries(NEXT_MOCKS)) {
          build.onResolve({ filter: new RegExp(`^${escapeRegex(module)}$`) }, (_args: any) => ({
            path: module,
            namespace: 'next-mock',
          }));
          build.onLoad({ filter: new RegExp(`^${escapeRegex(module)}$`), namespace: 'next-mock' }, (_args: any) => ({
            contents: mockCode,
            loader: 'jsx',
          }));
        }
      },
    });

    // Resolve @/ path alias to workDir, trying extensions
    plugins.push({
      name: 'path-alias',
      setup(build: any) {
        const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'];
        build.onResolve({ filter: /^@\// }, (args: { path: string }) => {
          const base = path.resolve(workDir, args.path.slice(2));
          if (fs.existsSync(base)) return { path: base };
          for (const ext of extensions) {
            const withExt = base + ext;
            if (fs.existsSync(withExt)) return { path: withExt };
          }
          for (const ext of extensions) {
            const idx = path.join(base, 'index' + ext);
            if (fs.existsSync(idx)) return { path: idx };
          }
          return { path: base };
        });
      },
    });

    // Keep React package resolution virtual. Serverless builds may not include
    // React's nested CJS files, and Sandpack/CodeSandbox package fetches are
    // blocked in production. The iframe loads React globals before this bundle.
    plugins.push({
      name: 'react-global-shims',
      setup(build: any) {
        build.onResolve(
          { filter: /^(react|react-dom(?:\/client)?|react\/jsx-runtime|react\/jsx-dev-runtime)$/ },
          (args: { path: string }) => ({
            path: args.path,
            namespace: 'react-global',
          }),
        );
        build.onLoad({ filter: /.*/, namespace: 'react-global' }, (args: { path: string }) => ({
          contents: REACT_GLOBAL_MODULES[args.path] || '',
          loader: 'js',
        }));
      },
    });

    const result = await esbuild.build({
      entryPoints: [previewEntryPath],
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'react',
      plugins,
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.jsx': 'jsx',
        '.js': 'js',
        '.json': 'json',
        '.css': 'empty',
        '.svg': 'dataurl',
        '.png': 'dataurl',
        '.jpg': 'dataurl',
        '.gif': 'dataurl',
        '.webp': 'dataurl',
        '.woff': 'dataurl',
        '.woff2': 'dataurl',
      },
      define: {
        'process.env.NODE_ENV': '"development"',
        'process.env.NEXT_PUBLIC_SUPABASE_URL': '""',
        'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': '""',
      },
    });

    const js = result.outputFiles[0]?.text || '';
    const css = cssChunks.join('\n\n');

    return { js, css, errors };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    return { js: '', css: '', errors };
  } finally {
    // Cleanup temp directory
    fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Build a complete HTML document from compiled JS + CSS for iframe rendering.
 */
export function buildPreviewHtml(js: string, css: string): string {
  const reactCdn = 'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js';
  const reactDomCdn = 'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; width: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    ${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="${reactCdn}"></script>
  <script src="${reactDomCdn}"></script>
  <script>
    // ── Error & console trap ────────────────────────────────────────────
    (function() {
      const originalConsole = {};
      ['log', 'warn', 'error', 'info', 'debug'].forEach(function(m) {
        originalConsole[m] = console[m];
        console[m] = function() {
          var args = Array.prototype.slice.call(arguments);
          originalConsole[m].apply(console, args);
          try {
            parent.postMessage({
              source: 'debuggai-preview',
              type: 'console.' + m,
              args: args.map(function(a) {
                try { return typeof a === 'string' ? a : JSON.stringify(a); }
                catch(e) { return String(a); }
              }),
              timestamp: Date.now()
            }, '*');
          } catch(e) {}
        };
      });

      window.onerror = function(message, source, lineno, colno, error) {
        parent.postMessage({
          source: 'debuggai-preview',
          type: 'runtime-error',
          message: String(message),
          source: source || '',
          lineno: lineno || 0,
          colno: colno || 0,
          stack: error && error.stack ? error.stack : '',
          timestamp: Date.now()
        }, '*');
        return false;
      };

      window.addEventListener('unhandledrejection', function(event) {
        var reason = event.reason;
        parent.postMessage({
          source: 'debuggai-preview',
          type: 'unhandled-rejection',
          message: String(reason && reason.message ? reason.message : reason),
          stack: reason && reason.stack ? reason.stack : '',
          timestamp: Date.now()
        }, '*');
      });

      parent.postMessage({ source: 'debuggai-preview', type: 'ready', timestamp: Date.now() }, '*');
    })();
    // ── End error trap ──────────────────────────────────────────────────

    try {
      ${js}
    } catch(e) {
      console.error('Preview render error:', e);
      window.onerror && window.onerror(e.message, '', 0, 0, e);
    }
  </script>
</body>
</html>`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        results.push(...(await findFiles(full)));
      } else {
        results.push(path.relative(dir, full));
      }
    }
  } catch {
    // skip inaccessible dirs
  }
  return results;
}
