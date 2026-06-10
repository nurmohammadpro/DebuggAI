/**
 * Instant starter templates for non-Next.js stacks.
 *
 * These provide complete file trees that render immediately in Sandpack
 * without any LLM call. When the Supabase Edge Function is unavailable,
 * these serve as a client-side fallback.
 *
 * Each template produces files in the format expected by Sandpack:
 *   { '/path': 'code' }
 */

export type StackTemplateFiles = Record<string, string>;

const REACT_VITE_TS_TEMPLATE: StackTemplateFiles = {
  '/package.json': JSON.stringify(
    {
      name: 'vite-react-app',
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
      dependencies: { react: '^19.2.4', 'react-dom': '^19.2.4' },
      devDependencies: {
        '@types/react': '^19.2.7',
        '@types/react-dom': '^19.2.3',
        '@vitejs/plugin-react': '^4.5.0',
        typescript: '^5.9.3',
        vite: '^6.3.0',
      },
    },
    null,
    2,
  ),
  '/vite.config.ts':
    "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n",
  '/tsconfig.json': JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: 'force',
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true,
      },
    },
    null,
    2,
  ),
  '/index.html':
    '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Vite + React</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
  '/src/main.tsx':
    "import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n",
  '/src/App.tsx':
    "import { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div className=\"min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center\">\n      <div className=\"text-center space-y-6 p-8\">\n        <h1 className=\"text-5xl font-bold text-white\">\n          Vite + React + TS\n        </h1>\n        <p className=\"text-slate-300 text-lg\">\n          Edit <code className=\"bg-slate-700 px-2 py-0.5 rounded text-sm\">src/App.tsx</code> and save to reload.\n        </p>\n        <button\n          onClick={() => setCount(c => c + 1)}\n          className=\"px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-lg transition-colors\"\n        >\n          Count: {count}\n        </button>\n      </div>\n    </div>\n  );\n}\n",
  '/src/index.css':
    '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  margin: 0;\n  font-family: system-ui, -apple-system, sans-serif;\n}\n',
  '/src/vite-env.d.ts':
    '/// <reference types="vite/client" />\n',
};

const REACT_VITE_JS_TEMPLATE: StackTemplateFiles = {
  '/package.json': JSON.stringify(
    {
      name: 'vite-react-app',
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: { react: '^19.2.4', 'react-dom': '^19.2.4' },
      devDependencies: { '@vitejs/plugin-react': '^4.5.0', vite: '^6.3.0' },
    },
    null,
    2,
  ),
  '/vite.config.js':
    "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n",
  '/index.html':
    '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Vite + React</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n',
  '/src/main.jsx':
    "import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n",
  '/src/App.jsx':
    "import { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div className=\"min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center\">\n      <div className=\"text-center space-y-6 p-8\">\n        <h1 className=\"text-5xl font-bold text-white\">\n          Vite + React\n        </h1>\n        <p className=\"text-slate-300 text-lg\">\n          Edit <code className=\"bg-slate-700 px-2 py-0.5 rounded text-sm\">src/App.jsx</code> and save to reload.\n        </p>\n        <button\n          onClick={() => setCount(c => c + 1)}\n          className=\"px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-lg transition-colors\"\n        >\n          Count: {count}\n        </button>\n      </div>\n    </div>\n  );\n}\n",
  '/src/index.css':
    '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  margin: 0;\n  font-family: system-ui, -apple-system, sans-serif;\n}\n',
};

const HTML_TAILWIND_TEMPLATE: StackTemplateFiles = {
  '/index.html':
    '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>HTML + Tailwind</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n    <link rel="stylesheet" href="/styles.css" />\n  </head>\n  <body class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">\n    <div class="text-center space-y-6 p-8">\n      <h1 class="text-5xl font-bold text-white">\n        HTML + Tailwind\n      </h1>\n      <p class="text-slate-300 text-lg">\n        Start editing this template to build your page.\n      </p>\n      <button\n        id="counterBtn"\n        class="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-lg transition-colors"\n      >\n        Count: 0\n      </button>\n    </div>\n    <script>\n      let count = 0;\n      document.getElementById(\"counterBtn\").addEventListener(\"click\", () => {\n        count++;\n        document.getElementById(\"counterBtn\").textContent = \"Count: \" + count;\n      });\n    </script>\n  </body>\n</html>\n',
  '/styles.css':
    'body {\n  margin: 0;\n  font-family: system-ui, -apple-system, sans-serif;\n}\n',
};

/** Map from stack ID to pre-built file tree used only when the Edge Function is down. */
export const INSTANT_TEMPLATES: Record<string, StackTemplateFiles> = {
  'react-vite': REACT_VITE_TS_TEMPLATE,
  'react-vite-js': REACT_VITE_JS_TEMPLATE,
  'html-tailwind': HTML_TAILWIND_TEMPLATE,
};

/**
 * Converts a flat StackTemplateFiles map into the VirtualProjectFiles format.
 */
export function templateFilesToRecord(
  tmpl: StackTemplateFiles,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, code] of Object.entries(tmpl)) {
    const key = path.startsWith('/') ? path.slice(1) : path;
    result[key] = code;
  }
  return result;
}
