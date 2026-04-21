export const queryKeys = {
  me: ['me'] as const,
  credits: (userId: string) => ['credits', userId] as const,
  myProjects: ['projects', 'mine'] as const,
  project: (id: string) => ['project', id] as const,
  projectVersions: (projectKey: string) => ['projectVersions', projectKey] as const,
  myDebugSessions: ['debugSessions', 'mine'] as const,
  myTransactions: ['transactions', 'mine'] as const,
  adminAnalytics: (period: string) => ['admin', 'analytics', period] as const,
  adminUsers: (query: string) => ['admin', 'users', query] as const,
  adminCredits: (query: string) => ['admin', 'credits', query] as const,
  adminHealth: ['admin', 'health'] as const,
};
