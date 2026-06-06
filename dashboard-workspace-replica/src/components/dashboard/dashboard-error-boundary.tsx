'use client';

import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  error: Error | null;
}

export class DashboardErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="max-w-md w-full rounded-[10px] bg-[var(--app-panel-2)] border border-[var(--app-border)] backdrop-blur-xl p-6 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-[var(--app-danger)]" />
            <h2 className="text-[16px] font-medium mb-2 text-[var(--app-text)]">Something went wrong</h2>
            <p className="text-[13px] text-[var(--app-text-muted)] mb-4">
              An unexpected error occurred. Please try reloading the page.
            </p>
            {this.state.error.message && (
              <p className="text-xs text-[var(--app-text-muted)] mb-4 font-mono bg-[var(--app-surface)] p-2 rounded-[6px] max-h-24 overflow-auto">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--app-accent)] px-4 py-2 text-[13px] font-medium text-black transition-colors hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
