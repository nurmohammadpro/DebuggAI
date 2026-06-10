/**
 * Application Constants
 */

export const CREDIT_COSTS = {
  DEBUG_ANALYSIS: 1,
  REVERSE_DEBUGGING: 2,
  WEB_BUILDER_SMALL: 20,
  WEB_BUILDER_MEDIUM: 50,
  WEB_BUILDER_LARGE: 100,
  SAVE_SESSION: 10,
} as const;

export const PLANS = {
  FREE: {
    name: 'Free',
    creditsPerMonth: 30,
    rateLimit: 10, // requests per minute
    historyDays: 7,
  },
  PRO: {
    name: 'Pro',
    price: 9,
    creditsPerMonth: 300,
    rateLimit: 30,
    historyDays: 90,
  },
  TEAM: {
    name: 'Team',
    price: 99,
    creditsPerMonth: 2500,
    rateLimit: 60,
    historyDays: 180,
  },
  BUSINESS: {
    name: 'Business',
    price: 299,
    creditsPerMonth: 10000,
    rateLimit: 120,
    historyDays: 365,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 999,
    creditsPerMonth: 40000,
    rateLimit: -1, // No rate limit
    historyDays: 365,
  },
} as const;

export const WEB_BUILDER_STACKS = [
  {
    id: 'nextjs',
    name: 'Next.js (App Router)',
    description: 'Next.js App Router, TypeScript, Tailwind',
    icon: '▲',
    sandpackTemplate: 'react-ts' as const,
    hasInstantTemplate: false,
  },
  {
    id: 'react-vite',
    name: 'React + Vite (TypeScript)',
    description: 'Vite, React 19, TypeScript, Tailwind — instant preview',
    icon: '⚡',
    sandpackTemplate: 'react-ts' as const,
    hasInstantTemplate: true,
  },
  {
    id: 'react-vite-js',
    name: 'React + Vite (JavaScript)',
    description: 'Vite, React 19, JavaScript, Tailwind — instant preview',
    icon: '⚛️',
    sandpackTemplate: 'react' as const,
    hasInstantTemplate: true,
  },
  {
    id: 'html-tailwind',
    name: 'HTML + Tailwind',
    description: 'Plain HTML/CSS with Tailwind CDN — fastest start',
    icon: '🌐',
    sandpackTemplate: 'static' as const,
    hasInstantTemplate: true,
  },
] as const;

export const DEBUG_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', icon: 'JS' },
  { id: 'typescript', name: 'TypeScript', icon: 'TS' },
  { id: 'php', name: 'PHP', icon: 'PHP' },
  { id: 'python', name: 'Python', icon: 'PY' },
  { id: 'go', name: 'Go', icon: 'GO' },
  { id: 'ruby', name: 'Ruby', icon: 'RB' },
  { id: 'java', name: 'Java', icon: 'JV' },
  { id: 'csharp', name: 'C#', icon: 'CS' },
  { id: 'rust', name: 'Rust', icon: 'RS' },
] as const;
