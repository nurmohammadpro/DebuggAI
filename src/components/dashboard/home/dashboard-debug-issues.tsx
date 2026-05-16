'use client';

import { useState } from 'react';

interface DebugIssue {
  id: string;
  type: 'error' | 'warning';
  title: string;
  message: string;
  location: string;
}

const mockIssues: DebugIssue[] = [
  {
    id: '1',
    type: 'error',
    title: 'Missing dependency',
    message: 'React must be in scope when using JSX',
    location: 'Dashboard.tsx:1',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Unresolved function',
    message: 'fetchData is not defined',
    location: 'Dashboard.tsx:8',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Missing error handling',
    message: 'useEffect callback should handle errors',
    location: 'Dashboard.tsx:7-9',
  },
];

export function DashboardDebugIssues() {
  const [issues] = useState<DebugIssue[]>(mockIssues);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
          Debug Issues
        </h2>
        <button className="btn btn-sm text-[12px] font-medium px-3 py-1.5 border border-[var(--border-default)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] transition-all">
          View All
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: DebugIssue }) {
  return (
    <div className="p-3 border border-[var(--app-border)] rounded-[6px] flex items-start gap-3 cursor-pointer hover:border-[var(--app-text-dim)] transition-all bg-[var(--app-panel)]">
      <div
        className={issue.type === 'error'
          ? 'w-8 h-8 rounded-[6px] flex items-center justify-center text-[14px] shrink-0 bg-[var(--app-danger-soft)] text-[var(--app-danger)]'
          : 'w-8 h-8 rounded-[6px] flex items-center justify-center text-[14px] shrink-0 bg-[var(--app-warning-soft)] text-[var(--app-warning)]'
        }
      >
        ⚠
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[var(--text-primary)] mb-0.5">
          {issue.title}
        </div>
        <div className="text-[12px] text-[var(--text-secondary)] mb-1">
          {issue.message}
        </div>
        <div className="text-[11px] text-[var(--text-tertiary)]">
          {issue.location}
        </div>
      </div>

      <div className="flex gap-1.5 shrink-0">
        <button className="btn btn-sm text-[12px] font-medium px-3 py-1.5 border border-[var(--border-default)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] transition-all">
          {issue.type === 'error' ? 'Fix' : 'Create'}
        </button>
      </div>
    </div>
  );
}
