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
  ENTERPRISE: {
    name: 'Enterprise',
    price: 49,
    creditsPerMonth: -1, // Unlimited
    rateLimit: -1, // Unlimited
    historyDays: 365,
  },
} as const;

export const WEB_BUILDER_STACKS = [
  {
    id: 'mern',
    name: 'MERN',
    description: 'MongoDB, Express, React, Node.js',
    icon: '⚛️',
  },
  {
    id: 'mean',
    name: 'MEAN',
    description: 'MongoDB, Express, Angular, Node.js',
    icon: '🅰️',
  },
  {
    id: 'laravel',
    name: 'Laravel',
    description: 'PHP, Laravel Framework, MySQL',
    icon: '🔴',
  },
  {
    id: 'django',
    name: 'Django',
    description: 'Python, Django, PostgreSQL',
    icon: '🐍',
  },
  {
    id: 'flask',
    name: 'Flask',
    description: 'Python, Flask, SQLAlchemy',
    icon: 'pepper',
  },
  {
    id: 'rails',
    name: 'Rails',
    description: 'Ruby, Rails, PostgreSQL',
    icon: 'gem',
  },
  {
    id: 'go',
    name: 'Go Stack',
    description: 'Go, Gin/Echo, PostgreSQL',
    icon: 'circle',
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
