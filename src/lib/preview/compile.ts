/**
 * Preview Compiler
 *
 * Bundles generated code (TSX/JSX) into a single JS bundle + CSS string
 * for in-browser preview rendering. Replaces the Docker sandbox for UI preview.
 *
 * - Uses esbuild (server-side) for fast TSX→JS compilation
 * - Strips Next.js-specific imports (next/navigation, next/link, next/image)
 * - Extracts CSS module files and converts to plain CSS
 * - Bundles React directly so the iframe does not depend on remote CDN
 *   scripts at runtime.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import fsp from 'fs/promises';
import crypto from 'crypto';
import { shouldIgnorePreviewPath } from '@/lib/project/virtual-files';

const TMP_DIR = path.join(os.tmpdir(), 'debuggai-compile');
const NODE_MODULES_DIR = path.join(process.cwd(), 'node_modules');
const resolveNodeModuleFile = (...segments: string[]) => path.join(NODE_MODULES_DIR, ...segments);
const RESOLVED_REACT_IMPORTS: Record<string, string> = {
  react: resolveNodeModuleFile('react', 'index.js'),
  'react-dom': resolveNodeModuleFile('react-dom', 'index.js'),
  'react-dom/client': resolveNodeModuleFile('react-dom', 'client.js'),
  'react/jsx-runtime': resolveNodeModuleFile('react', 'jsx-runtime.js'),
  'react/jsx-dev-runtime': resolveNodeModuleFile('react', 'jsx-dev-runtime.js'),
};
const REACT_PACKAGE_DEFAULT_EXPORTS = new Set(['react', 'react-dom']);
const RESPONSIVE_VARIANTS: Record<string, string> = {
  sm: '@media (min-width: 640px)',
  md: '@media (min-width: 768px)',
  lg: '@media (min-width: 1024px)',
  xl: '@media (min-width: 1280px)',
  '2xl': '@media (min-width: 1536px)',
};

const STATE_VARIANTS: Record<string, string> = {
  hover: ':hover',
  focus: ':focus',
  active: ':active',
  disabled: ':disabled',
  'focus-visible': ':focus-visible',
};

const SPACING_SCALE: Record<string, string> = {
  '0': '0',
  px: '1px',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '1.5': '0.375rem',
  '2': '0.5rem',
  '2.5': '0.625rem',
  '3': '0.75rem',
  '3.5': '0.875rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
  '11': '2.75rem',
  '12': '3rem',
  '14': '3.5rem',
  '16': '4rem',
  '20': '5rem',
  '24': '6rem',
  '28': '7rem',
  '32': '8rem',
  '36': '9rem',
  '40': '10rem',
  '44': '11rem',
  '48': '12rem',
  '52': '13rem',
  '56': '14rem',
  '60': '15rem',
  '64': '16rem',
  '72': '18rem',
  '80': '20rem',
  '96': '24rem',
};

const FONT_SIZES: Record<string, string> = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
  '7xl': '4.5rem',
  '8xl': '6rem',
  '9xl': '8rem',
};

const COLOR_PALETTE: Record<string, Record<string, string>> = {
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
  gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' },
  zinc: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' },
  neutral: { 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0a0a0a' },
  stone: { 50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917', 950: '#0c0a09' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
  yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' },
  green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e' },
  cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' },
  sky: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764' },
  pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843', 950: '#500724' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
};

const SEMANTIC_COLORS: Record<string, string> = {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: 'hsl(var(--card))',
  'card-foreground': 'hsl(var(--card-foreground))',
  popover: 'hsl(var(--popover, var(--card)))',
  'popover-foreground': 'hsl(var(--popover-foreground, var(--card-foreground)))',
  primary: 'hsl(var(--primary))',
  'primary-foreground': 'hsl(var(--primary-foreground))',
  secondary: 'hsl(var(--secondary))',
  'secondary-foreground': 'hsl(var(--secondary-foreground))',
  muted: 'hsl(var(--muted))',
  'muted-foreground': 'hsl(var(--muted-foreground))',
  accent: 'hsl(var(--accent))',
  'accent-foreground': 'hsl(var(--accent-foreground))',
  destructive: 'hsl(var(--destructive))',
  'destructive-foreground': 'hsl(var(--destructive-foreground))',
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
};

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
    function normalizePreviewComponentType(type) {
      if (!type || typeof type !== 'object') return type;
      if (type.$$typeof) return type;
      if (typeof type.default === 'function' || (type.default && type.default.$$typeof)) {
        return type.default;
      }
      var typeInfo = '[unknown]';
      try {
        if (Array.isArray(type)) typeInfo = 'Array[' + type.length + ']';
        else if (typeof type === 'object' && type !== null) {
          var keys = Object.keys(type).slice(0, 8);
          typeInfo = '{ ' + keys.join(', ') + (Object.keys(type).length > 8 ? ', ...' : '') + ' }';
          if (typeof type.displayName === 'string') typeInfo += ' displayName=' + JSON.stringify(type.displayName);
          if (typeof type.toString === 'function') {
            try { var s = type.toString(); if (s !== '[object Object]') typeInfo += ' toString=' + JSON.stringify(s.slice(0, 120)); } catch(e) {}
          }
        }
      } catch(e) {}
      console.warn('[preview] UnsupportedPreviewComponent — type is not a valid React component. typeof=' + typeof type + ' keys=' + typeInfo);
      return function UnsupportedPreviewComponent({ children }) {
        return React.createElement(
          'div',
          {
            style: {
              padding: '0.75rem',
              border: '1px solid #f97316',
              borderRadius: '0.5rem',
              color: '#9a3412',
              background: '#fff7ed',
              fontSize: '0.875rem',
            },
          },
          children || 'Unsupported preview component'
        );
      };
    }
    function createPreviewElement(type, props, key) {
      type = normalizePreviewComponentType(type);
      const finalProps = key === undefined ? (props || {}) : { ...(props || {}), key };
      if (Array.isArray(finalProps.children)) {
        const { children, ...rest } = finalProps;
        return React.createElement(type, rest, ...children);
      }
      return React.createElement(type, finalProps);
    }
    export function jsx(type, props, key) {
      return createPreviewElement(type, props, key);
    }
    export function jsxs(type, props, key) {
      return createPreviewElement(type, props, key);
    }
  `,
  'react/jsx-dev-runtime': `
    const React = window.React;
    export const Fragment = React.Fragment;
    function normalizePreviewComponentType(type) {
      if (!type || typeof type !== 'object') return type;
      if (type.$$typeof) return type;
      if (typeof type.default === 'function' || (type.default && type.default.$$typeof)) {
        return type.default;
      }
      var typeInfo = '[unknown]';
      try {
        if (Array.isArray(type)) typeInfo = 'Array[' + type.length + ']';
        else if (typeof type === 'object' && type !== null) {
          var keys = Object.keys(type).slice(0, 8);
          typeInfo = '{ ' + keys.join(', ') + (Object.keys(type).length > 8 ? ', ...' : '') + ' }';
          if (typeof type.displayName === 'string') typeInfo += ' displayName=' + JSON.stringify(type.displayName);
          if (typeof type.toString === 'function') {
            try { var s = type.toString(); if (s !== '[object Object]') typeInfo += ' toString=' + JSON.stringify(s.slice(0, 120)); } catch(e) {}
          }
        }
      } catch(e) {}
      console.warn('[preview] UnsupportedPreviewComponent — type is not a valid React component. typeof=' + typeof type + ' keys=' + typeInfo);
      return function UnsupportedPreviewComponent({ children }) {
        return React.createElement(
          'div',
          {
            style: {
              padding: '0.75rem',
              border: '1px solid #f97316',
              borderRadius: '0.5rem',
              color: '#9a3412',
              background: '#fff7ed',
              fontSize: '0.875rem',
            },
          },
          children || 'Unsupported preview component'
        );
      };
    }
    function createPreviewElement(type, props, key) {
      type = normalizePreviewComponentType(type);
      const finalProps = key === undefined ? (props || {}) : { ...(props || {}), key };
      if (Array.isArray(finalProps.children)) {
        const { children, ...rest } = finalProps;
        return React.createElement(type, rest, ...children);
      }
      return React.createElement(type, finalProps);
    }
    export function jsxDEV(type, props, key) {
      return createPreviewElement(type, props, key);
    }
  `,
};
void REACT_GLOBAL_MODULES;

// Next.js modules that get mock replacements in preview mode
const NEXT_MOCKS: Record<string, string> = {
  'next/navigation': `
    const noop = () => {};
    function getRouteState() {
      return window.__debuggaiRouteState || {
        pathname: '/',
        search: '',
        hash: '',
        href: '/',
        params: {},
        push: noop,
        replace: noop,
        back: noop,
        forward: noop,
        refresh: noop,
        prefetch: noop,
      };
    }
    export const useRouter = () => {
      const route = getRouteState();
      return {
        push: route.push,
        replace: route.replace,
        back: route.back,
        forward: route.forward,
        refresh: route.refresh,
        prefetch: route.prefetch,
        pathname: route.pathname || '/',
        query: route.query || {},
        asPath: route.href || '/',
      };
    };
    export const usePathname = () => getRouteState().pathname || '/';
    export const useSearchParams = () => new URLSearchParams(getRouteState().search || '');
    export const useParams = () => getRouteState().params || {};
    export const redirect = (url) => { window.__debuggai_redirect = url; };
    export const notFound = noop;
    export const useSelectedLayoutSegment = () => null;
    export const useSelectedLayoutSegments = () => [];
    export default { useRouter, usePathname, useSearchParams, useParams, redirect, notFound };
  `,
  'next/link': `
    import React from 'react';
    export default function Link({ href, children, className, ...props }) {
      return React.createElement('a', {
        href,
        className,
        onClick: (e) => {
          e.preventDefault();
          if (window.__debuggaiRouteState && typeof window.__debuggaiRouteState.push === 'function') {
            window.__debuggaiRouteState.push(href);
          } else {
            window.__debuggai_link = href;
          }
        },
        ...props
      }, children);
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

// Common UI packages shimmed as virtual modules for preview compilation.
// These resolve to lightweight inline implementations so esbuild never
// tries to find them in node_modules of the temp compile dir.
const UI_PACKAGE_SHIMS: Record<string, string> = {
  'lucide-react': `
    import React from 'react';
    const makeIcon = (name) => {
      const Icon = ({ size = 24, color = 'currentColor', strokeWidth = 2, className, style, ...props }) =>
        React.createElement('svg', {
          xmlns: 'http://www.w3.org/2000/svg',
          width: size, height: size, viewBox: '0 0 24 24',
          fill: 'none', stroke: color, strokeWidth,
          strokeLinecap: 'round', strokeLinejoin: 'round',
          className, style, ...props,
        });
      Icon.displayName = name;
      return Icon;
    };
    // Function proxy: valid as <Icons /> and also supports <Icons.Search />.
    const DefaultIcon = makeIcon('Icon');
    export default new Proxy(DefaultIcon, { get: (_, name) => makeIcon(String(name)) });
    ${[
      'Activity','AlertCircle','AlertTriangle','Archive','ArrowDown','ArrowLeft',
      'ArrowRight','ArrowUp','Award','Badge','Bell','Book','BookOpen','Box',
      'Briefcase','Bug','Building','Calendar','Check','CheckCircle','CheckSquare',
      'ChevronDown','ChevronLeft','ChevronRight','ChevronUp','Circle','Clock',
      'Cloud','Code','Code2','Coins','Command','Copy','CreditCard','Database',
      'Download','Edit','Edit2','Edit3','ExternalLink','Eye','EyeOff','File',
      'FileCode','FileText','Filter','Flag','Folder','FolderOpen','Globe',
      'Grid','Grip','GripHorizontal','GripVertical','Hash','Heart','HelpCircle','Home','Image','Info','Key','Layout',
      'Link','List','Loader','Loader2','Lock','LogIn','LogOut','Mail','Map',
      'MapPin','Menu','MessageCircle','MessageSquare','Minus','Monitor','Moon',
      'MoreHorizontal','MoreVertical','Move','Music','Package','Paperclip',
      'Pause','Play','Plus','PlusCircle','Power','Printer','RefreshCw','Search',
      'Send','Settings','Share','Shield','ShieldCheck','ShoppingCart','Sidebar',
      'Slash','Sliders','Smartphone','Star','Sun','Table','Tag','Terminal',
      'Trash','Trash2','TrendingUp','TrendingDown','Type','Upload','User',
      'UserCheck','UserPlus','Users','Video','Wifi','X','XCircle','Zap',
      'ZapOff','ZoomIn','ZoomOut',
    ].map(n => `export const ${n} = makeIcon('${n}');`).join('\n')}
  `,
  'class-variance-authority': `
    export function cva(base, config) {
      return function(props) {
        if (!config || !props) return base || '';
        const { variants = {}, defaultVariants = {} } = config;
        const classes = [base];
        for (const [key, variantMap] of Object.entries(variants)) {
          const val = props[key] ?? defaultVariants[key];
          if (val !== undefined && variantMap[val]) classes.push(variantMap[val]);
        }
        return classes.filter(Boolean).join(' ');
      };
    }
    export const cx = (...args) => args.filter(Boolean).join(' ');
  `,
  'clsx': `
    export default function clsx(...args) {
      return args.flat(Infinity).filter(x => x && typeof x === 'string').join(' ');
    }
    export { clsx };
  `,
  'tailwind-merge': `
    export function twMerge(...classes) { return classes.filter(Boolean).join(' '); }
    export function cn(...classes) { return classes.filter(Boolean).join(' '); }
    export default twMerge;
  `,
  '@radix-ui/react-slot': `
    import React from 'react';
    export const Slot = React.forwardRef(({ children, ...props }, ref) => {
      if (React.isValidElement(children)) {
        return React.cloneElement(children, { ...props, ref });
      }
      return React.createElement('span', { ...props, ref }, children);
    });
    export const Slottable = ({ children }) => children;
    export default Slot;
  `,
  '@radix-ui/react-alert-dialog': `
    import React from 'react';
    const noop = () => {};
    export const Root = ({ children }) => children;
    export const Trigger = ({ children, asChild, ...p }) => React.createElement(asChild ? React.Fragment : 'button', asChild ? {} : p, children);
    export const Portal = ({ children }) => children;
    export const Overlay = (p) => React.createElement('div', p);
    export const Content = (p) => React.createElement('div', p);
    export const Title = (p) => React.createElement('h2', p);
    export const Description = (p) => React.createElement('p', p);
    export const Action = ({ children, ...p }) => React.createElement('button', p, children);
    export const Cancel = ({ children, ...p }) => React.createElement('button', p, children);
  `,
  'framer-motion': `
    import React from 'react';
    const createMotionComponent = (tag) => React.forwardRef(({ children, animate, initial, exit, transition, whileHover, whileTap, variants, ...props }, ref) =>
      React.createElement(tag, { ...props, ref }, children)
    );
    const MotionRoot = createMotionComponent('div');
    const motion = new Proxy(MotionRoot, {
      get: (_, tag) => React.forwardRef(({ children, animate, initial, exit, transition, whileHover, whileTap, variants, ...props }, ref) =>
        React.createElement(tag, { ...props, ref }, children)
      )
    });
    export { motion };
    export const AnimatePresence = ({ children }) => children;
    export const useAnimation = () => ({ start: () => {}, stop: () => {} });
    export const useMotionValue = (v) => ({ get: () => v, set: () => {} });
    export const useTransform = (v, fn) => ({ get: () => fn ? fn(v.get()) : v.get() });
    export default motion;
  `,
  'sonner': `
    import React from 'react';
    export const Toaster = () => null;
    export const toast = Object.assign(
      (msg) => console.log('[toast]', msg),
      { success: (m) => console.log('[toast.success]', m), error: (m) => console.error('[toast.error]', m), loading: (m) => console.log('[toast.loading]', m) }
    );
    export default toast;
  `,
  'next-themes': `
    import React from 'react';
    export const ThemeProvider = ({ children }) => children;
    export const useTheme = () => ({ theme: 'dark', setTheme: () => {}, resolvedTheme: 'dark', themes: ['light','dark'] });
  `,
  'recharts': `
    import React from 'react';
    const stub = (name) => (props) => React.createElement('div', { 'data-chart': name, style: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#1e293b', borderRadius: '8px', color: '#94a3b8', fontSize: '14px' } }, name + ' Chart');
    export const LineChart = stub('LineChart');
    export const BarChart = stub('BarChart');
    export const PieChart = stub('PieChart');
    export const AreaChart = stub('AreaChart');
    export const Line = () => null;
    export const Bar = () => null;
    export const Pie = () => null;
    export const Area = () => null;
    export const XAxis = () => null;
    export const YAxis = () => null;
    export const CartesianGrid = () => null;
    export const Tooltip = () => null;
    export const Legend = () => null;
    export const ResponsiveContainer = ({ children }) => children;
    export const Cell = () => null;
  `,
  '@dnd-kit/core': `
    import React from 'react';
    export function DndContext({ children }) { return React.createElement(React.Fragment, null, children); }
    export function DragOverlay({ children }) { return React.createElement(React.Fragment, null, children); }
    export function closestCenter() { return null; }
    export function closestCorners() { return null; }
    export function rectIntersection() { return null; }
    export function pointerWithin() { return null; }
    export function KeyboardSensor() {}
    export function PointerSensor() {}
    export function MouseSensor() {}
    export function TouchSensor() {}
    export function useSensor(sensor, options) { return { sensor, options }; }
    export function useSensors(...sensors) { return sensors; }
    export function useDraggable() {
      return {
        attributes: {},
        listeners: {},
        setNodeRef: () => {},
        transform: null,
        isDragging: false,
      };
    }
    export function useDroppable() {
      return {
        active: null,
        isOver: false,
        over: null,
        rect: null,
        setNodeRef: () => {},
      };
    }
  `,
  '@dnd-kit/sortable': `
    import React from 'react';
    export function SortableContext({ children }) { return React.createElement(React.Fragment, null, children); }
    export function useSortable() {
      return {
        active: null,
        activeIndex: -1,
        attributes: {},
        data: {},
        index: -1,
        isDragging: false,
        isOver: false,
        listeners: {},
        newIndex: -1,
        over: null,
        overIndex: -1,
        rect: null,
        setActivatorNodeRef: () => {},
        setNodeRef: () => {},
        transform: null,
        transition: undefined,
      };
    }
    export function arrayMove(items, oldIndex, newIndex) {
      const copy = Array.isArray(items) ? [...items] : [];
      if (oldIndex < 0 || newIndex < 0 || oldIndex >= copy.length || newIndex >= copy.length) return copy;
      const [item] = copy.splice(oldIndex, 1);
      copy.splice(newIndex, 0, item);
      return copy;
    }
    export function sortableKeyboardCoordinates() { return undefined; }
    export const horizontalListSortingStrategy = {};
    export const rectSortingStrategy = {};
    export const rectSwappingStrategy = {};
    export const verticalListSortingStrategy = {};
  `,
  '@dnd-kit/utilities': `
    export const CSS = {
      Transform: {
        toString(transform) {
          if (!transform) return undefined;
          const x = Number(transform.x || 0);
          const y = Number(transform.y || 0);
          const scaleX = transform.scaleX == null ? 1 : Number(transform.scaleX);
          const scaleY = transform.scaleY == null ? 1 : Number(transform.scaleY);
          return 'translate3d(' + x + 'px, ' + y + 'px, 0) scaleX(' + scaleX + ') scaleY(' + scaleY + ')';
        },
      },
    };
  `,
};

// CSS module files get converted to plain CSS
function isCssModule(filePath: string) {
  return filePath.endsWith('.module.css') || filePath.endsWith('.module.scss') || filePath.endsWith('.module.sass');
}

function collectNamedImports(files: Record<string, string>, moduleName: string) {
  const names = new Set<string>();
  const importRe = new RegExp(`import\\s*\\{([\\s\\S]*?)\\}\\s*from\\s*['"]${escapeRegex(moduleName)}['"]`, 'g');

  for (const content of Object.values(files)) {
    let match: RegExpExecArray | null;
    while ((match = importRe.exec(content)) !== null) {
      for (const part of (match[1] || '').split(',')) {
        const imported = part.trim().split(/\s+as\s+/i)[0]?.trim();
        if (imported && /^[A-Za-z_$][\w$]*$/.test(imported)) {
          names.add(imported);
        }
      }
    }
  }

  return names;
}

function addLucideIconExports(shim: string, iconNames: Set<string>) {
  const extra = [...iconNames]
    .filter((name) => !shim.includes(`export const ${name} `))
    .map((name) => `export const ${name} = makeIcon('${name}');`)
    .join('\n');

  return extra ? `${shim}\n${extra}\n` : shim;
}

function collectNamedImportsByModule(files: Record<string, string>) {
  const imports = new Map<string, Set<string>>();
  const importRe = /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g;

  for (const content of Object.values(files)) {
    let match: RegExpExecArray | null;
    while ((match = importRe.exec(content)) !== null) {
      const moduleName = match[2];
      if (!moduleName || moduleName.startsWith('.') || moduleName.startsWith('@/')) continue;
      const names = imports.get(moduleName) ?? new Set<string>();
      for (const part of (match[1] || '').split(',')) {
        const imported = part.trim().split(/\s+as\s+/i)[0]?.trim();
        if (imported && /^[A-Za-z_$][\w$]*$/.test(imported)) {
          names.add(imported);
        }
      }
      imports.set(moduleName, names);
    }
  }

  return imports;
}

function makeUnknownPackageShim(moduleName: string, namedExports: Set<string> | undefined) {
  const exports = [...(namedExports ?? new Set<string>())]
    .map((name) => `export const ${name} = stub;`)
    .join('\n');

  return `
    // auto-stub: ${moduleName}
    const stub = new Proxy(function StubComponent() { return null; }, {
      get: (_target, prop) => {
        if (
          prop === '$$typeof' ||
          prop === 'prototype' ||
          prop === 'displayName' ||
          prop === 'propTypes' ||
          prop === 'defaultProps' ||
          prop === 'contextTypes' ||
          prop === 'childContextTypes' ||
          prop === 'getDerivedStateFromProps' ||
          prop === 'getDerivedStateFromError' ||
          prop === 'getSnapshotBeforeUpdate' ||
          String(prop).startsWith('component') ||
          String(prop).startsWith('UNSAFE_component') ||
          prop === Symbol.toStringTag
        ) return undefined;
        return stub;
      },
      apply: () => null,
    });
    export default stub;
    ${exports}
  `;
}

function makeUiComponentShim(importPath: string) {
  const segment = importPath.split('/').pop() || 'component';
  const preferredDefault = toPascalCase(segment);
  const components = [
    ['Accordion', 'div'], ['AccordionContent', 'div'], ['AccordionItem', 'div'], ['AccordionTrigger', 'button'],
    ['Alert', 'div'], ['AlertDescription', 'div'], ['AlertDialog', 'div'], ['AlertDialogAction', 'button'],
    ['AlertDialogCancel', 'button'], ['AlertDialogContent', 'div'], ['AlertDialogDescription', 'p'],
    ['AlertDialogFooter', 'div'], ['AlertDialogHeader', 'div'], ['AlertDialogOverlay', 'div'],
    ['AlertDialogPortal', 'div'], ['AlertDialogTitle', 'h2'], ['AlertDialogTrigger', 'button'],
    ['Avatar', 'span'], ['AvatarFallback', 'span'], ['AvatarImage', 'img'], ['Badge', 'span'],
    ['Button', 'button'], ['Calendar', 'div'], ['Card', 'div'], ['CardAction', 'div'],
    ['CardContent', 'div'], ['CardDescription', 'p'], ['CardFooter', 'div'], ['CardHeader', 'div'],
    ['CardTitle', 'h3'], ['Checkbox', 'input'], ['Command', 'div'], ['CommandEmpty', 'div'],
    ['CommandGroup', 'div'], ['CommandInput', 'input'], ['CommandItem', 'div'], ['CommandList', 'div'],
    ['Dialog', 'div'], ['DialogClose', 'button'], ['DialogContent', 'div'], ['DialogDescription', 'p'],
    ['DialogFooter', 'div'], ['DialogHeader', 'div'], ['DialogOverlay', 'div'], ['DialogPortal', 'div'],
    ['DialogTitle', 'h2'], ['DialogTrigger', 'button'], ['DropdownMenu', 'div'], ['DropdownMenuCheckboxItem', 'div'],
    ['DropdownMenuContent', 'div'], ['DropdownMenuGroup', 'div'], ['DropdownMenuItem', 'div'],
    ['DropdownMenuLabel', 'div'], ['DropdownMenuRadioGroup', 'div'], ['DropdownMenuRadioItem', 'div'],
    ['DropdownMenuSeparator', 'hr'], ['DropdownMenuShortcut', 'span'], ['DropdownMenuSub', 'div'],
    ['DropdownMenuSubContent', 'div'], ['DropdownMenuSubTrigger', 'div'], ['DropdownMenuTrigger', 'button'],
    ['Input', 'input'], ['Label', 'label'], ['Popover', 'div'], ['PopoverContent', 'div'],
    ['PopoverTrigger', 'button'], ['Progress', 'div'], ['RadioGroup', 'div'], ['RadioGroupItem', 'button'],
    ['ScrollArea', 'div'], ['Select', 'select'], ['SelectContent', 'div'], ['SelectGroup', 'div'],
    ['SelectItem', 'option'], ['SelectLabel', 'label'], ['SelectScrollDownButton', 'button'],
    ['SelectScrollUpButton', 'button'], ['SelectSeparator', 'hr'], ['SelectTrigger', 'button'],
    ['SelectValue', 'span'], ['Separator', 'hr'], ['Sheet', 'div'], ['SheetClose', 'button'],
    ['SheetContent', 'div'], ['SheetDescription', 'p'], ['SheetFooter', 'div'], ['SheetHeader', 'div'],
    ['SheetOverlay', 'div'], ['SheetPortal', 'div'], ['SheetTitle', 'h2'], ['SheetTrigger', 'button'],
    ['Skeleton', 'div'], ['Slider', 'input'], ['Switch', 'button'], ['Table', 'table'],
    ['TableBody', 'tbody'], ['TableCaption', 'caption'], ['TableCell', 'td'], ['TableFooter', 'tfoot'],
    ['TableHead', 'th'], ['TableHeader', 'thead'], ['TableRow', 'tr'], ['Tabs', 'div'],
    ['TabsContent', 'div'], ['TabsList', 'div'], ['TabsTrigger', 'button'], ['Textarea', 'textarea'],
    ['Toggle', 'button'], ['ToggleGroup', 'div'], ['ToggleGroupItem', 'button'], ['Tooltip', 'span'],
    ['TooltipContent', 'span'], ['TooltipProvider', 'span'], ['TooltipTrigger', 'span'],
  ];

  const exports = components
    .map(([name, tag]) => `export const ${name} = makeComponent('${tag}', '${name}');`)
    .join('\n');

  return `
    import React from 'react';
    const makeComponent = (tag, displayName) => {
      const Component = React.forwardRef(({ asChild, children, className, type, checked, ...props }, ref) => {
        const elementTag = asChild ? 'span' : tag;
        const safeProps = { ...props, ref, className };
        if (tag === 'button') safeProps.type = type || 'button';
        if (tag === 'input') safeProps.type = type || (displayName === 'Switch' || displayName === 'Checkbox' ? 'checkbox' : 'text');
        if (tag === 'img') {
          safeProps.alt = props.alt || '';
          return React.createElement('img', safeProps);
        }
        if (tag === 'option') return React.createElement('option', safeProps, children || props.value || displayName);
        return React.createElement(elementTag, safeProps, children);
      });
      Component.displayName = displayName;
      return Component;
    };
    ${exports}
    const DefaultComponent = typeof ${preferredDefault} !== 'undefined' ? ${preferredDefault} : makeComponent('div', 'UiComponent');
    export default DefaultComponent;
  `;
}

function buildPreviewUtilityCss(files: Record<string, string>) {
  const classes = collectClassCandidates(files);
  const rules = new Set<string>();

  for (const className of classes) {
    const rule = buildUtilityRule(className);
    if (rule) rules.add(rule);
  }

  return [
    '/* DebuggAI preview utility CSS: generated from project class names */',
    ':root { color-scheme: light dark; --background: 0 0% 100%; --foreground: 222.2 84% 4.9%; --card: 0 0% 100%; --card-foreground: 222.2 84% 4.9%; --primary: 222.2 47.4% 11.2%; --primary-foreground: 210 40% 98%; --secondary: 210 40% 96.1%; --secondary-foreground: 222.2 47.4% 11.2%; --muted: 210 40% 96.1%; --muted-foreground: 215.4 16.3% 46.9%; --accent: 210 40% 96.1%; --accent-foreground: 222.2 47.4% 11.2%; --destructive: 0 84.2% 60.2%; --destructive-foreground: 210 40% 98%; --border: 214.3 31.8% 91.4%; --input: 214.3 31.8% 91.4%; --ring: 222.2 84% 4.9%; --radius: 0.5rem; }',
    '.dark { --background: 222.2 84% 4.9%; --foreground: 210 40% 98%; --card: 222.2 84% 4.9%; --card-foreground: 210 40% 98%; --primary: 210 40% 98%; --primary-foreground: 222.2 47.4% 11.2%; --secondary: 217.2 32.6% 17.5%; --secondary-foreground: 210 40% 98%; --muted: 217.2 32.6% 17.5%; --muted-foreground: 215 20.2% 65.1%; --accent: 217.2 32.6% 17.5%; --accent-foreground: 210 40% 98%; --destructive: 0 62.8% 30.6%; --destructive-foreground: 210 40% 98%; --border: 217.2 32.6% 17.5%; --input: 217.2 32.6% 17.5%; --ring: 212.7 26.8% 83.9%; }',
    'button, input, select, textarea { font: inherit; }',
    'button { cursor: pointer; }',
    'a { color: inherit; text-decoration: none; }',
    'img, svg, video, canvas { display: block; max-width: 100%; }',
    ...rules,
  ].join('\n');
}

function collectClassCandidates(files: Record<string, string>) {
  const candidates = new Set<string>();
  const addTokens = (value: string) => {
    value
      .replace(/\$\{[^}]*\}/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => {
        const cleaned = token.replace(/^[`'"{[(]+|[`'",;})\]]+$/g, '');
        if (isLikelyUtilityClass(cleaned)) candidates.add(cleaned);
      });
  };

  const classAttrRe = /\b(?:className|class)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`|\{`([^`]*)`\})/g;
  const stringRe = /['"`]([^'"`]*(?:bg-|text-|border-|rounded|shadow|flex|grid|gap-|items-|justify-|min-h-|max-w-|mx-|my-|px-|py-|p[trblxy]?)-[^'"`]*)['"`]/g;

  for (const content of Object.values(files)) {
    let match: RegExpExecArray | null;
    while ((match = classAttrRe.exec(content)) !== null) {
      addTokens(match[1] || match[2] || match[3] || match[4] || '');
    }
    while ((match = stringRe.exec(content)) !== null) {
      addTokens(match[1] || '');
    }
  }

  return candidates;
}

function isLikelyUtilityClass(token: string) {
  if (!token || token.length > 120 || token.includes('=')) return false;
  if (!/^[!:\w\-\/\[\].#%(),]+$/.test(token)) return false;
  if (/^(true|false|null|undefined|return|const|let|var)$/.test(token)) return false;
  return (
    token.includes('-') ||
    token.includes(':') ||
    ['container', 'flex', 'grid', 'hidden', 'block', 'inline', 'inline-block', 'inline-flex', 'relative', 'absolute', 'fixed', 'sticky', 'static', 'sr-only'].includes(token)
  );
}

function buildUtilityRule(originalClass: string) {
  const important = originalClass.startsWith('!');
  const className = important ? originalClass.slice(1) : originalClass;
  const parts = splitVariants(className);
  const base = parts.pop();
  if (!base) return null;

  const declarations = declarationsForBaseClass(base);
  if (!declarations) return null;

  const responsive = parts.find((part) => RESPONSIVE_VARIANTS[part]);
  const darkPrefix = parts.includes('dark') ? '.dark ' : '';
  const stateSuffix = parts.map((part) => STATE_VARIANTS[part]).filter(Boolean).join('');
  const selector = `${darkPrefix}.${escapeCssClass(originalClass)}${stateSuffix}`;
  const scopedDeclarations = important ? declarations.replace(/;/g, ' !important;') : declarations;
  const body = scopedDeclarations.startsWith('>')
    ? `${selector}${scopedDeclarations}`
    : `${selector}{${scopedDeclarations}}`;

  return responsive ? `${RESPONSIVE_VARIANTS[responsive]}{${body}}` : body;
}

function splitVariants(className: string) {
  const parts: string[] = [];
  let current = '';
  let bracketDepth = 0;

  for (const char of className) {
    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === ':' && bracketDepth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  parts.push(current);
  return parts.filter(Boolean);
}

function declarationsForBaseClass(className: string): string | null {
  const simple: Record<string, string> = {
    container: 'width:100%;max-width:80rem;margin-left:auto;margin-right:auto;',
    block: 'display:block;',
    inline: 'display:inline;',
    'inline-block': 'display:inline-block;',
    flex: 'display:flex;',
    'inline-flex': 'display:inline-flex;',
    grid: 'display:grid;',
    hidden: 'display:none;',
    relative: 'position:relative;',
    absolute: 'position:absolute;',
    fixed: 'position:fixed;',
    sticky: 'position:sticky;',
    static: 'position:static;',
    isolate: 'isolation:isolate;',
    'min-h-screen': 'min-height:100vh;',
    'h-screen': 'height:100vh;',
    'w-screen': 'width:100vw;',
    'w-full': 'width:100%;',
    'h-full': 'height:100%;',
    'min-w-0': 'min-width:0;',
    'min-h-0': 'min-height:0;',
    'max-w-none': 'max-width:none;',
    'mx-auto': 'margin-left:auto;margin-right:auto;',
    'overflow-hidden': 'overflow:hidden;',
    'overflow-auto': 'overflow:auto;',
    'overflow-x-hidden': 'overflow-x:hidden;',
    'overflow-y-auto': 'overflow-y:auto;',
    'object-cover': 'object-fit:cover;',
    'object-contain': 'object-fit:contain;',
    'items-start': 'align-items:flex-start;',
    'items-center': 'align-items:center;',
    'items-end': 'align-items:flex-end;',
    'items-stretch': 'align-items:stretch;',
    'justify-start': 'justify-content:flex-start;',
    'justify-center': 'justify-content:center;',
    'justify-end': 'justify-content:flex-end;',
    'justify-between': 'justify-content:space-between;',
    'justify-around': 'justify-content:space-around;',
    'justify-evenly': 'justify-content:space-evenly;',
    'flex-col': 'flex-direction:column;',
    'flex-row': 'flex-direction:row;',
    'flex-wrap': 'flex-wrap:wrap;',
    'flex-1': 'flex:1 1 0%;',
    'shrink-0': 'flex-shrink:0;',
    'grow': 'flex-grow:1;',
    'text-left': 'text-align:left;',
    'text-center': 'text-align:center;',
    'text-right': 'text-align:right;',
    uppercase: 'text-transform:uppercase;',
    lowercase: 'text-transform:lowercase;',
    capitalize: 'text-transform:capitalize;',
    truncate: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    'whitespace-nowrap': 'white-space:nowrap;',
    'font-thin': 'font-weight:100;',
    'font-light': 'font-weight:300;',
    'font-normal': 'font-weight:400;',
    'font-medium': 'font-weight:500;',
    'font-semibold': 'font-weight:600;',
    'font-bold': 'font-weight:700;',
    'font-extrabold': 'font-weight:800;',
    'font-black': 'font-weight:900;',
    italic: 'font-style:italic;',
    'not-italic': 'font-style:normal;',
    'leading-none': 'line-height:1;',
    'leading-tight': 'line-height:1.25;',
    'leading-snug': 'line-height:1.375;',
    'leading-normal': 'line-height:1.5;',
    'leading-relaxed': 'line-height:1.625;',
    'leading-loose': 'line-height:2;',
    'tracking-tight': 'letter-spacing:-0.025em;',
    'tracking-tighter': 'letter-spacing:-0.05em;',
    'tracking-wide': 'letter-spacing:0.025em;',
    'tracking-wider': 'letter-spacing:0.05em;',
    'tracking-widest': 'letter-spacing:0.1em;',
    'rounded-none': 'border-radius:0;',
    rounded: 'border-radius:0.25rem;',
    'rounded-sm': 'border-radius:0.125rem;',
    'rounded-md': 'border-radius:0.375rem;',
    'rounded-lg': 'border-radius:0.5rem;',
    'rounded-xl': 'border-radius:0.75rem;',
    'rounded-2xl': 'border-radius:1rem;',
    'rounded-3xl': 'border-radius:1.5rem;',
    'rounded-full': 'border-radius:9999px;',
    border: 'border-width:1px;border-style:solid;',
    'border-0': 'border-width:0;',
    'border-2': 'border-width:2px;border-style:solid;',
    'border-4': 'border-width:4px;border-style:solid;',
    'border-t': 'border-top-width:1px;border-top-style:solid;',
    'border-b': 'border-bottom-width:1px;border-bottom-style:solid;',
    'border-l': 'border-left-width:1px;border-left-style:solid;',
    'border-r': 'border-right-width:1px;border-right-style:solid;',
    'shadow-sm': 'box-shadow:0 1px 2px 0 rgb(0 0 0 / 0.05);',
    shadow: 'box-shadow:0 1px 3px 0 rgb(0 0 0 / 0.1),0 1px 2px -1px rgb(0 0 0 / 0.1);',
    'shadow-md': 'box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1),0 2px 4px -2px rgb(0 0 0 / 0.1);',
    'shadow-lg': 'box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1),0 4px 6px -4px rgb(0 0 0 / 0.1);',
    'shadow-xl': 'box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1),0 8px 10px -6px rgb(0 0 0 / 0.1);',
    'shadow-2xl': 'box-shadow:0 25px 50px -12px rgb(0 0 0 / 0.25);',
    'shadow-none': 'box-shadow:none;',
    'transition-all': 'transition-property:all;transition-duration:150ms;transition-timing-function:cubic-bezier(0.4,0,0.2,1);',
    transition: 'transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-duration:150ms;transition-timing-function:cubic-bezier(0.4,0,0.2,1);',
    'duration-150': 'transition-duration:150ms;',
    'duration-200': 'transition-duration:200ms;',
    'duration-300': 'transition-duration:300ms;',
    'duration-500': 'transition-duration:500ms;',
    'ease-in-out': 'transition-timing-function:cubic-bezier(0.4,0,0.2,1);',
    'cursor-pointer': 'cursor:pointer;',
    'pointer-events-none': 'pointer-events:none;',
    'select-none': 'user-select:none;',
    'sr-only': 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0;',
  };

  if (simple[className]) return simple[className];
  if (FONT_SIZES[className.replace(/^text-/, '')] && className.startsWith('text-')) {
    const size = FONT_SIZES[className.replace(/^text-/, '')];
    return `font-size:${size};line-height:${lineHeightForFontSize(className.replace(/^text-/, ''))};`;
  }

  const color = colorDeclaration(className);
  if (color) return color;

  const spacing = spacingDeclaration(className);
  if (spacing) return spacing;

  const sizing = sizingDeclaration(className);
  if (sizing) return sizing;

  const grid = gridDeclaration(className);
  if (grid) return grid;

  const opacity = className.match(/^opacity-(\d+)$/);
  if (opacity) return `opacity:${Number(opacity[1]) / 100};`;

  const zIndex = className.match(/^z-(\d+)$/);
  if (zIndex) return `z-index:${zIndex[1]};`;

  return null;
}

function spacingDeclaration(className: string) {
  const match = className.match(/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(.+)$/);
  if (!match) return null;

  const [, prefix, rawValue] = match;
  const value = normalizeUtilityValue(rawValue);
  if (!value) return null;

  const propMap: Record<string, string[]> = {
    p: ['padding'],
    px: ['padding-left', 'padding-right'],
    py: ['padding-top', 'padding-bottom'],
    pt: ['padding-top'],
    pr: ['padding-right'],
    pb: ['padding-bottom'],
    pl: ['padding-left'],
    m: ['margin'],
    mx: ['margin-left', 'margin-right'],
    my: ['margin-top', 'margin-bottom'],
    mt: ['margin-top'],
    mr: ['margin-right'],
    mb: ['margin-bottom'],
    ml: ['margin-left'],
    gap: ['gap'],
    'gap-x': ['column-gap'],
    'gap-y': ['row-gap'],
  };

  if (prefix === 'space-y') return `> :not([hidden]) ~ :not([hidden]){margin-top:${value};}`;
  if (prefix === 'space-x') return `> :not([hidden]) ~ :not([hidden]){margin-left:${value};}`;

  return propMap[prefix]?.map((prop) => `${prop}:${value};`).join('') ?? null;
}

function sizingDeclaration(className: string) {
  const match = className.match(/^(w|h|min-w|min-h|max-w|max-h)-(.+)$/);
  if (!match) return null;
  const [, prefix, rawValue] = match;
  const named: Record<string, string> = {
    auto: 'auto',
    full: '100%',
    screen: prefix.includes('h') ? '100vh' : '100vw',
    min: 'min-content',
    max: 'max-content',
    fit: 'fit-content',
    prose: '65ch',
    xs: '20rem',
    sm: '24rem',
    md: '28rem',
    lg: '32rem',
    xl: '36rem',
    '2xl': '42rem',
    '3xl': '48rem',
    '4xl': '56rem',
    '5xl': '64rem',
    '6xl': '72rem',
    '7xl': '80rem',
  };
  const value = named[rawValue] ?? normalizeUtilityValue(rawValue);
  if (!value) return null;

  const property = ({ w: 'width', h: 'height', 'min-w': 'min-width', 'min-h': 'min-height', 'max-w': 'max-width', 'max-h': 'max-height' } as Record<string, string>)[prefix];
  return `${property}:${value};`;
}

function gridDeclaration(className: string) {
  const cols = className.match(/^grid-cols-(\d+)$/);
  if (cols) return `grid-template-columns:repeat(${cols[1]},minmax(0,1fr));`;
  const rows = className.match(/^grid-rows-(\d+)$/);
  if (rows) return `grid-template-rows:repeat(${rows[1]},minmax(0,1fr));`;
  const colSpan = className.match(/^col-span-(\d+)$/);
  if (colSpan) return `grid-column:span ${colSpan[1]} / span ${colSpan[1]};`;
  return null;
}

function colorDeclaration(className: string) {
  const match = className.match(/^(bg|text|border|ring|from|via|to)-(.+)$/);
  if (!match) return null;
  const [, prefix, rawColor] = match;
  const color = resolveColor(rawColor);
  if (!color) {
    if (prefix === 'bg' && rawColor.startsWith('gradient-to-')) {
      const direction = rawColor.replace('gradient-to-', '');
      const directions: Record<string, string> = { r: 'to right', l: 'to left', t: 'to top', b: 'to bottom', br: 'to bottom right', bl: 'to bottom left', tr: 'to top right', tl: 'to top left' };
      return `background-image:linear-gradient(${directions[direction] || 'to right'},var(--tw-gradient-stops));`;
    }
    return null;
  }

  if (prefix === 'bg') return `background-color:${color};`;
  if (prefix === 'text') return `color:${color};`;
  if (prefix === 'border') return `border-color:${color};`;
  if (prefix === 'ring') return `box-shadow:0 0 0 3px ${color};`;
  if (prefix === 'from') return `--tw-gradient-from:${color};--tw-gradient-to:rgba(255,255,255,0);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to);`;
  if (prefix === 'via') return `--tw-gradient-stops:var(--tw-gradient-from),${color},var(--tw-gradient-to);`;
  if (prefix === 'to') return `--tw-gradient-to:${color};`;
  return null;
}

function resolveColor(rawColor: string) {
  if (rawColor === 'transparent') return 'transparent';
  if (rawColor === 'current') return 'currentColor';
  if (rawColor === 'black') return '#000';
  if (rawColor === 'white') return '#fff';
  if (SEMANTIC_COLORS[rawColor]) return SEMANTIC_COLORS[rawColor];
  if (rawColor.startsWith('[') && rawColor.endsWith(']')) return rawColor.slice(1, -1).replace(/_/g, ' ');

  const [base, opacity] = rawColor.split('/');
  const parts = base.split('-');
  const shade = parts.pop();
  const family = parts.join('-');
  const hex = family && shade ? COLOR_PALETTE[family]?.[shade] : null;
  if (!hex) return null;

  if (!opacity) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${Number(opacity) / 100})`;
}

function normalizeUtilityValue(rawValue: string) {
  if (SPACING_SCALE[rawValue]) return SPACING_SCALE[rawValue];
  if (rawValue.startsWith('[') && rawValue.endsWith(']')) return rawValue.slice(1, -1).replace(/_/g, ' ');
  const fraction = rawValue.match(/^(\d+)\/(\d+)$/);
  if (fraction) return `${(Number(fraction[1]) / Number(fraction[2])) * 100}%`;
  return null;
}

function lineHeightForFontSize(size: string) {
  return ['xs', 'sm'].includes(size) ? '1.25rem' : ['base', 'lg', 'xl'].includes(size) ? '1.75rem' : '1.1';
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  if (value.length !== 6) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function escapeCssClass(className: string) {
  return className.replace(/(^-?\d)|[^a-zA-Z0-9_-]/g, (match, digit) => {
    if (digit) return `\\3${digit} `;
    return `\\${match}`;
  });
}

function toPascalCase(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
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
      if (shouldIgnorePreviewPath(normalized)) continue;
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

    // Auto-generate missing component files for unresolved relative imports.
    // When the AI generates a page.tsx that imports ./components/Navbar,
    // ./components/Hero, etc. without creating those files, this generates
    // minimal React components on disk so they render as real elements in
    // the preview (empty divs) instead of showing placeholder stubs.
    await autoGenerateMissingComponents(workDir, files);

    // Determine the actual entry point
    const entryFull = path.join(workDir, entryPoint);
    let resolvedEntry: string | null = null;

    // Try several entry point patterns
    const VALID_CODE_EXTS = ['.tsx', '.ts', '.jsx', '.js', '.mjs'];
    const isValidEntry = (p: string) => VALID_CODE_EXTS.some((ext) => p.endsWith(ext));

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
      if (!isValidEntry(candidate)) continue;
      try {
        await fsp.access(candidate);
        resolvedEntry = candidate;
        break;
      } catch {
        const jsxCandidate = candidate.replace(/\.tsx$/, '.jsx').replace(/\.ts$/, '.js');
        if (!isValidEntry(jsxCandidate)) continue;
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
    const lucideIconImports = collectNamedImports(files, 'lucide-react');
    const namedImportsByModule = collectNamedImportsByModule(files);

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
          if (args.path.startsWith('@/components/ui/')) {
            return { path: args.path, namespace: 'ui-component-shim' };
          }
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
        build.onLoad({ filter: /.*/, namespace: 'ui-component-shim' }, (args: { path: string }) => ({
          contents: makeUiComponentShim(args.path),
          loader: 'jsx',
        }));
      },
    });

    // Shim common UI packages so esbuild never tries node_modules resolution
    plugins.push({
      name: 'ui-package-shims',
      setup(build: any) {
        const shimmed = Object.keys(UI_PACKAGE_SHIMS);
        const filter = new RegExp(`^(${shimmed.map(escapeRegex).join('|')})$`);
        build.onResolve({ filter }, (args: { path: string }) => ({
          path: args.path,
          namespace: 'ui-shim',
        }));
        build.onLoad({ filter: /.*/, namespace: 'ui-shim' }, (args: { path: string }) => ({
          contents: args.path === 'lucide-react'
            ? addLucideIconExports(UI_PACKAGE_SHIMS[args.path] || '', lucideIconImports)
            : UI_PACKAGE_SHIMS[args.path] || 'export default {}',
          loader: 'jsx',
        }));
      },
    });

    // Resolve React to the installed package so the preview bundle stays local.
    plugins.push({
      name: 'react-package-resolver',
      setup(build: any) {
        build.onResolve(
          { filter: /^(react|react-dom|react-dom\/client|react\/jsx-runtime|react\/jsx-dev-runtime)$/ },
          (args: { path?: unknown }) => {
            if (typeof args.path !== 'string') return null;
            if (!RESOLVED_REACT_IMPORTS[args.path]) return null;
            return { path: args.path, namespace: 'react-package-shim' };
          },
        );
        build.onLoad({ filter: /.*/, namespace: 'react-package-shim' }, (args: { path?: unknown }) => {
          if (typeof args.path !== 'string') return null;
          const resolved = RESOLVED_REACT_IMPORTS[args.path];
          if (!resolved) return null;
          const contents = REACT_PACKAGE_DEFAULT_EXPORTS.has(args.path)
            ? [
                `export * from ${JSON.stringify(resolved)};`,
                `import mod from ${JSON.stringify(resolved)};`,
                'export default mod;',
              ].join('\n')
            : `export * from ${JSON.stringify(resolved)};`;
          return { contents, loader: 'js', resolveDir: path.dirname(resolved) };
        });
      },
    });

    // Catch-all: any bare package import still unresolved gets an empty stub.
    // Prevents "Could not resolve" hard failures for packages the AI imports
    // but that aren't shimmed above.
    plugins.push({
      name: 'unresolved-fallback',
      setup(build: any) {
        build.onResolve({ filter: /^[^./]/ }, (args: { path: string; resolveDir: string }) => {
          if (args.resolveDir === '' || args.path.startsWith('.')) return;
          if (
            args.path === 'react' ||
            args.path === 'react-dom' ||
            args.path === 'react-dom/client' ||
            args.path === 'react/jsx-runtime' ||
            args.path === 'react/jsx-dev-runtime'
          ) {
            return;
          }
          return { path: args.path, namespace: 'empty-stub' };
        });
        build.onLoad({ filter: /.*/, namespace: 'empty-stub' }, (args: { path: string }) => ({
          contents: makeUnknownPackageShim(args.path, namedImportsByModule.get(args.path)),
          loader: 'js',
        }));
      },
    });

    // Fallback for unresolved relative imports (./foo, ../bar).
    // When the AI generates a large page that imports many component files
    // (e.g. ./components/Navbar, ./components/Hero) but those files aren't
    // included in the generated output, the build would otherwise hard-fail.
    // Instead, create a stub component so the preview renders with placeholders.
    plugins.push({
      name: 'relative-import-fallback',
      setup(build: any) {
        const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'];
        build.onResolve({ filter: /^\.\.?\// }, (args: { path: string; resolveDir: string }) => {
          if (!args.resolveDir) return;
          // Try to resolve the path on disk (esbuild default resolver would do this,
          // but we need to check ourselves to detect the "file not found" case)
          const base = path.resolve(args.resolveDir, args.path);
          if (fs.existsSync(base)) return;
          for (const ext of extensions) {
            if (fs.existsSync(base + ext)) return;
          }
          for (const ext of extensions) {
            if (fs.existsSync(path.join(base, 'index' + ext))) return;
          }
          // File doesn't exist — provide a stub
          return { path: args.path, namespace: 'relative-import-stub' };
        });
        build.onLoad({ filter: /.*/, namespace: 'relative-import-stub' }, (args: { path: string }) => {
          const name = args.path.split('/').pop() || 'Component';
          return {
            contents: `
import React from 'react';
const Stub = React.forwardRef(function Stub(props, ref) {
  return React.createElement('div', { ref, style: { padding: '1rem', border: '1px dashed #444', borderRadius: '0.375rem', color: '#888', fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'center' } }, '// ${name}');
});
Stub.displayName = 'Stub(${name})';
export default Stub;
`.trimStart(),
            loader: 'jsx',
          };
        });
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
    const css = [buildPreviewUtilityCss(files), ...cssChunks].filter(Boolean).join('\n\n');

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
export function buildPreviewHtml(js: string, css: string, routePath: string = '/', routePattern: string = routePath): string {
  // Force dark mode so Tailwind `dark:` variants remain available without
  // relying on upstream theme inference from generated CSS.
  const themeClass = '"dark"';

  return `<!DOCTYPE html>
<html lang="en" class=${themeClass}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:*; img-src 'self' data: blob: https:; font-src 'self' data:;" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; width: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    ${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // ── Sandboxed storage shim ──────────────────────────────────────────
    // srcDoc previews intentionally do not use allow-same-origin, so direct
    // access to localStorage/sessionStorage throws a SecurityError. Generated
    // apps commonly use storage for todos, themes, and drafts; provide a safe
    // in-memory Storage-compatible shim instead of weakening the iframe sandbox.
    (function() {
      function createMemoryStorage() {
        var store = Object.create(null);
        return {
          get length() { return Object.keys(store).length; },
          key: function(index) {
            var keys = Object.keys(store);
            return keys[index] || null;
          },
          getItem: function(key) {
            key = String(key);
            return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
          },
          setItem: function(key, value) {
            store[String(key)] = String(value);
          },
          removeItem: function(key) {
            delete store[String(key)];
          },
          clear: function() {
            store = Object.create(null);
          },
        };
      }

      function installStorage(name) {
        try {
          void window[name];
        } catch (e) {
          try {
            Object.defineProperty(window, name, {
              value: createMemoryStorage(),
              configurable: true,
            });
          } catch (defineError) {}
        }
      }

      installStorage('localStorage');
      installStorage('sessionStorage');
    })();

    // ── Preview route state ─────────────────────────────────────────────
    // Keeps the iframe aware of the current route so useRouter/usePathname
    // inside generated code can behave like a real app.
    (function() {
      function parseHref(href) {
        var raw = String(href || '/');
        var resolved;
        try {
          resolved = new URL(raw, window.location.origin);
        } catch (e) {
          resolved = new URL('/', window.location.origin);
        }
        var pathname = resolved.pathname || '/';
        if (pathname !== '/') pathname = pathname.replace(/\/+$/, '');
        var search = resolved.search || '';
        var hash = resolved.hash || '';
        return {
          pathname: pathname || '/',
          search: search,
          hash: hash,
          href: (pathname || '/') + search + hash,
        };
      }

      function normalizePattern(entryPoint) {
        var normalized = String(entryPoint || '').replace(/\\/g, '/').replace(/^(\.\/)+/, '');
        normalized = normalized.replace(/^(?:src\/)?app\//, '');
        normalized = normalized.replace(/^(?:src\/)?pages\//, '');
        normalized = normalized.replace(/\/page\.[a-zA-Z0-9]+$/, '');
        normalized = normalized.replace(/\/index\.[a-zA-Z0-9]+$/, '');
        normalized = normalized.replace(/\.[a-zA-Z0-9]+$/, '');
        normalized = normalized.replace(/^\/*/, '').replace(/\/*$/, '');
        return '/' + normalized;
      }

      function matchParams(pattern, pathname) {
        var params = {};
        var patternParts = String(pattern || '/').split('/').filter(Boolean);
        var pathParts = String(pathname || '/').split('/').filter(Boolean);
        for (var i = 0, j = 0; i < patternParts.length; i++, j++) {
          var part = patternParts[i];
          if (!part) continue;
          if (part.startsWith('[...') && part.endsWith(']')) {
            params[part.slice(4, -1)] = pathParts.slice(j).join('/');
            return params;
          }
          if (part.startsWith('[[...') && part.endsWith(']]')) {
            params[part.slice(5, -2)] = pathParts.slice(j).join('/');
            return params;
          }
          if (part.startsWith('[') && part.endsWith(']')) {
            params[part.slice(1, -1)] = pathParts[j] || '';
            continue;
          }
          if (pathParts[j] !== part) return {};
        }
        return params;
      }

      var state = parseHref(${JSON.stringify(routePath)});
      var pattern = ${JSON.stringify(routePattern || routePath)};
      var historyStack = [state.href];
      var historyIndex = 0;

      function sync(nextHref, mode, silent) {
        var next = parseHref(nextHref);
        state.pathname = next.pathname;
        state.search = next.search;
        state.hash = next.hash;
        state.href = next.href;
        state.params = matchParams(pattern, state.pathname);

        if (mode === 'replace') {
          historyStack[historyIndex] = next.href;
        } else if (mode === 'push') {
          historyStack = historyStack.slice(0, historyIndex + 1);
          historyStack.push(next.href);
          historyIndex = historyStack.length - 1;
        }

        if (!silent) {
          try {
            parent.postMessage({
              source: 'debuggai-preview',
              type: 'navigate',
              href: state.href,
              pathname: state.pathname,
              search: state.search,
              hash: state.hash,
              timestamp: Date.now(),
            }, '*');
          } catch (e) {}
        }
      }

      window.__debuggaiRouteState = {
        get pathname() { return state.pathname; },
        get search() { return state.search; },
        get hash() { return state.hash; },
        get href() { return state.href; },
        get params() { return state.params || {}; },
        push: function(href) { sync(href, 'push', false); },
        replace: function(href) { sync(href, 'replace', false); },
        back: function() {
          if (historyIndex <= 0) return;
          historyIndex--;
          sync(historyStack[historyIndex], 'replace', false);
        },
        forward: function() {
          if (historyIndex >= historyStack.length - 1) return;
          historyIndex++;
          sync(historyStack[historyIndex], 'replace', false);
        },
        refresh: function() {},
        prefetch: function() {},
      };

      state.params = matchParams(pattern, state.pathname);
    })();

    // ── Navigation interceptor (SPA routing) ────────────────────────────
    // Intercepts <a> clicks and routes them through the parent frame so the
    // compile pipeline can swap to the correct page entry point without a
    // full-page top-level navigation.
    (function() {
      var currentPath = '/';
      document.addEventListener('click', function(e) {
        var el = e.target;
        while (el && el !== document.body) {
          if (el.tagName === 'A' && el.href) {
            var href = el.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !el.hasAttribute('download')) {
              e.preventDefault();
              e.stopPropagation();
              if (href !== currentPath) {
                currentPath = href;
                try {
                  parent.postMessage({
                    source: 'debuggai-preview',
                    type: 'navigate',
                    href: href,
                    timestamp: Date.now()
                  }, '*');
                } catch(e) {}
              }
            }
            break;
          }
          el = el.parentElement;
        }
      }, true);

      // Listen for the parent to signal which page to show after recompilation
      window.addEventListener('message', function(event) {
        if (event.data && event.data.source === 'debuggai-parent' && event.data.type === 'route') {
          currentPath = event.data.href || '/';
        }
      });
    })();

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

    // ── Network interceptor ──────────────────────────────────────────────
    // Captures fetch/XHR failures so the agent can diagnose API errors,
    // CORS issues, and missing endpoints visible only in the browser.
    // Also blocks requests to external domains (not localhost or CDN) to
    // prevent accidental data exfiltration from the preview sandbox.
    (function() {
      function reportNetworkError(details) {
        try {
          parent.postMessage({
            source: 'debuggai-preview',
            type: 'network-error',
            url: details.url,
            method: details.method,
            status: details.status,
            statusText: details.statusText || '',
            error: details.error || '',
            timestamp: Date.now()
          }, '*');
        } catch(e) {}
      }

       var ALLOWED_DOMAINS = ['localhost', '127.0.0.1', 'unpkg.com', 'esm.sh', 'cdn.jsdelivr.net'];

      function isExternal(url) {
        if (!url || url.startsWith('/') || url.startsWith('#') || url.startsWith('data:') || url.startsWith('blob:')) return false;
        if (url.startsWith('http://localhost') || url.startsWith('https://localhost')) return false;
        if (url.startsWith('http://127.0.0.1') || url.startsWith('https://127.0.0.1')) return false;
        for (var i = 0; i < ALLOWED_DOMAINS.length; i++) {
          if (url.indexOf(ALLOWED_DOMAINS[i]) !== -1) return false;
        }
        return true;
      }

      // Intercept fetch
      var _fetch = window.fetch;
      window.fetch = function(input, init) {
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        var method = (init && init.method) || 'GET';
        if (isExternal(url)) {
          console.warn('[preview] Blocked external fetch: ' + method + ' ' + url + ' — only localhost and CDN requests are allowed in preview.');
          reportNetworkError({ url: url, method: method, status: 0, statusText: '', error: 'External requests blocked in preview sandbox' });
          return Promise.reject(new Error('External requests blocked in preview sandbox'));
        }
        return _fetch.apply(this, arguments).then(function(res) {
          if (!res.ok) {
            reportNetworkError({ url: url, method: method, status: res.status, statusText: res.statusText });
          }
          return res;
        }).catch(function(err) {
          reportNetworkError({ url: url, method: method, status: 0, statusText: '', error: err.message || String(err) });
          throw err;
        });
      };

      // Intercept XMLHttpRequest
      var XHR = XMLHttpRequest;
      var _open = XHR.prototype.open;
      var _send = XHR.prototype.send;
      XHR.prototype.open = function(method, url) {
        this._debuggai_method = method;
        this._debuggai_url = url;
        return _open.apply(this, arguments);
      };
      XHR.prototype.send = function() {
        var self = this;
        var url = self._debuggai_url || '';
        var method = self._debuggai_method || 'GET';
        self.addEventListener('error', function() {
          reportNetworkError({ url: url, method: method, status: self.status || 0, statusText: self.statusText || '', error: 'XHR network error' });
        });
        self.addEventListener('loadend', function() {
          if (self.status > 0 && self.status >= 400) {
            reportNetworkError({ url: url, method: method, status: self.status, statusText: self.statusText || '' });
          }
        });
        return _send.apply(this, arguments);
      };
    })();

    // ── Element inspection mode ──────────────────────────────────────────
    (function() {
      var inspectActive = false;
      var overlay = null;
      var tooltip = null;

      function createOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;border:2px solid #3b82f6;background:rgba(59,130,246,0.08);border-radius:2px;transition:all 0.08s ease;display:none;';
        document.body.appendChild(overlay);
        tooltip = document.createElement('div');
        tooltip.style.cssText = 'position:fixed;z-index:100000;background:#1e1e2e;color:#cdd6f4;font-size:11px;font-family:monospace;padding:6px 10px;border-radius:6px;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.4);max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none;';
        document.body.appendChild(tooltip);
      }

      function removeOverlay() {
        if (overlay) { overlay.remove(); overlay = null; }
        if (tooltip) { tooltip.remove(); tooltip = null; }
      }

      function getElementPath(el) {
        var path = [];
        while (el && el !== document.body && el !== document.documentElement) {
          var tag = el.tagName.toLowerCase();
          if (el.id) { path.unshift(tag + '#' + el.id); break; }
          var siblings = Array.from(el.parentNode ? el.parentNode.children : []).filter(function(s) { return s.tagName === el.tagName; });
          var idx = siblings.indexOf(el);
          path.unshift(tag + (siblings.length > 1 ? ':nth-child(' + (idx + 1) + ')' : ''));
          el = el.parentNode;
        }
        return path.join(' > ');
      }

      function getElementInfo(el) {
        var rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          classes: (el.className && typeof el.className === 'string') ? el.className.trim() : '',
          text: (el.textContent || '').trim().slice(0, 120),
          path: getElementPath(el),
          attributes: Array.from(el.attributes || []).filter(function(a) { return !['class','id','style'].includes(a.name); }).map(function(a) { return a.name + '="' + a.value + '"'; }).join(' '),
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        };
      }

      function onMouseMove(e) {
        if (!inspectActive) return;
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === overlay || el === tooltip) return;
        var rect = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        var info = getElementInfo(el);
        tooltip.style.display = 'block';
        tooltip.textContent = '<' + info.tag + (info.id ? '#' + info.id : '') + (info.classes ? '.' + info.classes.split(/\\s+/).slice(0, 3).join('.') : '') + '>';
        var tx = rect.left;
        var ty = rect.top - 28;
        if (ty < 4) ty = rect.bottom + 6;
        if (tx + 320 > window.innerWidth) tx = window.innerWidth - 328;
        tooltip.style.top = ty + 'px';
        tooltip.style.left = tx + 'px';
      }

      function onClick(e) {
        if (!inspectActive) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === overlay || el === tooltip) return;
        var info = getElementInfo(el);
        try {
          parent.postMessage({ source: 'debuggai-preview', type: 'element-clicked', element: info, timestamp: Date.now() }, '*');
        } catch(ex) {}
        setInspectMode(false);
      }

      function onKeyDown(e) {
        if (e.key === 'Escape' && inspectActive) { e.preventDefault(); setInspectMode(false); }
      }

      function setInspectMode(active) {
        inspectActive = active;
        if (active) {
          createOverlay();
          document.body.style.cursor = 'crosshair';
          document.addEventListener('mousemove', onMouseMove, true);
          document.addEventListener('click', onClick, true);
          document.addEventListener('keydown', onKeyDown, true);
        } else {
          removeOverlay();
          document.body.style.cursor = '';
          document.removeEventListener('mousemove', onMouseMove, true);
          document.removeEventListener('click', onClick, true);
          document.removeEventListener('keydown', onKeyDown, true);
          try {
            parent.postMessage({ source: 'debuggai-preview', type: 'inspect-mode-changed', active: false }, '*');
          } catch(ex) {}
        }
      }

      window.addEventListener('message', function(event) {
        if (event.data && event.data.source === 'debuggai-parent' && event.data.type === 'inspect-mode') {
          setInspectMode(!!event.data.active);
        }
      });
    })();

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

export function entryPointToPreviewPath(entryPoint: string): string {
  return routePathFromEntryPoint(entryPoint);
}

export function entryPointToRoutePattern(entryPoint: string): string {
  return routePathFromEntryPoint(entryPoint);
}

function routePathFromEntryPoint(entryPoint: string): string {
  const normalized = normalizeEntryPoint(entryPoint);
  if (!normalized) return '/';

  const appMatch = normalized.match(/^(?:src\/)?app\/(.+)\/page\.[a-zA-Z0-9]+$/);
  if (appMatch) {
    return segmentsToRoutePath(appMatch[1] || '');
  }

  const rootAppMatch = normalized.match(/^(?:src\/)?app\/page\.[a-zA-Z0-9]+$/);
  if (rootAppMatch) return '/';

  const pagesMatch = normalized.match(/^(?:src\/)?pages\/(.+)\.[a-zA-Z0-9]+$/);
  if (pagesMatch) {
    const route = pagesMatch[1] || '';
    if (route === 'index') return '/';
    return segmentsToRoutePath(route.replace(/\/index$/, ''));
  }

  return '/';
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeEntryPoint(entryPoint: string) {
  return String(entryPoint || '').replace(/\\/g, '/').replace(/^(\.\/)+/, '');
}

function segmentsToRoutePath(route: string) {
  const segments = String(route || '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => {
      if (/^\(.*\)$/.test(segment)) return false;
      if (segment.startsWith('_')) return false;
      return true;
    });
  if (segments.length === 0) return '/';
  return `/${segments.join('/')}`;
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

/**
 * Scan source files for unresolved relative imports and auto-generate
 * minimal component files so they render as real React elements in the
 * preview (empty divs) instead of producing "Could not resolve" build
 * errors or showing placeholder stubs.
 */
async function autoGenerateMissingComponents(
  workDir: string,
  files: Record<string, string>,
) {
  const CODE_EXTS = ['.tsx', '.ts', '.jsx', '.js'];
  const SKIP_EXTS = /\.(css|json|svg|png|jpe?g|gif|webp|woff2?|mp4|webm|ico)$/i;

  // Build lookup of existing paths (normalized, no extension)
  const existingPaths = new Set<string>();
  for (const fp of Object.keys(files)) {
    existingPaths.add(path.normalize(fp));
  }

  for (const [filePath, content] of Object.entries(files)) {
    if (!/\.(tsx?|jsx?|mjs)$/i.test(filePath)) continue;
    const fileDir = path.dirname(filePath);

    // Match all `from '...'` import paths (handles import X, import {X}, export {X}, etc.)
    const importRe = /from\s+['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRe.exec(content)) !== null) {
      const importPath = match[1]!;

      // Only care about relative and @/ alias imports
      let resolved: string | null = null;
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        resolved = path.normalize(path.join(fileDir, importPath));
      } else if (importPath.startsWith('@/')) {
        resolved = path.normalize(importPath.slice(2));
      }
      if (!resolved || SKIP_EXTS.test(resolved)) continue;

      // Check if file already exists on disk
      if (existingPaths.has(resolved)) continue;
      let found = false;
      for (const ext of CODE_EXTS) {
        if (existingPaths.has(resolved + ext)) { found = true; break; }
        if (existingPaths.has(path.join(resolved, 'index' + ext))) { found = true; break; }
      }
      if (found) continue;

      // Derive component name from filename
      const segment = resolved.split(/[/\\]/).pop() || 'Component';
      const componentName = toPascalCase(segment.replace(/\.\w+$/, ''));

      // Generate a minimal component file on disk
      const generatedPath = resolved + '.tsx';
      const fullPath = path.join(workDir, generatedPath);
      await fsp.mkdir(path.dirname(fullPath), { recursive: true });
      await fsp.writeFile(
        fullPath,
        [
          "import React from 'react';",
          '',
          `export default function ${componentName}() {`,
          "  return React.createElement('div', null);",
          '}',
          '',
        ].join('\n'),
        'utf-8',
      );
      existingPaths.add(generatedPath);
    }
  }
}
