'use client';

import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
          <Card className="max-w-md w-full p-6 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-4">
              An unexpected error occurred. Please try reloading the page.
            </p>
            {this.state.error.message && (
              <p className="text-xs text-muted-foreground mb-4 font-mono bg-muted p-2 rounded-md max-h-24 overflow-auto">
                {this.state.error.message}
              </p>
            )}
            <Button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload page
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
