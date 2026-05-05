/**
 * Web Builder Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 * Two-column layout: Chat | Code/Preview (togglable like v0.dev)
 */

'use client';

import { useState } from 'react';
import { ChatPanel } from '@/components/web-builder/chat-panel';
import { CodeEditor } from '@/components/web-builder/code-editor';
import { PreviewPane } from '@/components/web-builder/preview-pane';
import { useEffect } from 'react';
import { useSessionStore } from '@/store/session-store';
import { useRouter } from 'next/navigation';

type EditorView = 'code' | 'preview';

export default function WebBuilderPage() {
  const { isAuthenticated, isLoading } = useSessionStore();
  const router = useRouter();
  const [view, setView] = useState<EditorView>('code');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ds-green)' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] p-4 sm:p-6">
      <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Chat Panel */}
        <div className="lg:col-span-1 min-h-0">
          <ChatPanel height="100%" />
        </div>

        {/* Code Editor + Preview — togglable */}
        <div className="lg:col-span-2 min-h-0 flex flex-col bg-card rounded-xl border border-border/40 overflow-hidden">
          {/* Toggle bar */}
          <div className="h-11 border-b border-border/40 flex items-center px-3 shrink-0">
            <div className="flex-1" />
            <div className="flex items-center bg-muted/40 rounded-full p-0.5 border border-border/40">
              <button
                className={`h-7 px-3 rounded-full text-xs transition-colors ${
                  view === 'code'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setView('code')}
              >
                Code
              </button>
              <button
                className={`h-7 px-3 rounded-full text-xs transition-colors ${
                  view === 'preview'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setView('preview')}
              >
                Preview
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {view === 'preview' ? (
              <PreviewPane height="100%" chromeless className="h-full bg-transparent" />
            ) : (
              <CodeEditor
                height="100%"
                showHeader={false}
                className="rounded-none border-0 shadow-none bg-transparent"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
