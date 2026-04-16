/**
 * Web Builder Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

'use client';

import { ChatPanel } from '@/components/web-builder/chat-panel';
import { CodeEditor } from '@/components/web-builder/code-editor';
import { PreviewPane } from '@/components/web-builder/preview-pane';
import { useEffect } from 'react';
import { useSessionStore } from '@/store/session-store';
import { useRouter } from 'next/navigation';

export default function WebBuilderPage() {
  const { isAuthenticated, isLoading } = useSessionStore();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ds-green)' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="border-b border-border bg-surface/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <h1 className="h2">Web Builder</h1>
            <p className="text-xs text-text2">
              Build apps with AI - Describe what you want and watch it come to life
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text2 hover:text-text transition-colors"
            >
              Need help?
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          {/* Chat Panel */}
          <div className="lg:col-span-1">
            <ChatPanel height="calc(100vh-180px)" />
          </div>

          {/* Editor */}
          <div className="lg:col-span-1">
            <CodeEditor height="calc(100vh-180px)" />
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <PreviewPane height="calc(100vh-180px)" />
          </div>
        </div>
      </div>
    </div>
  );
}
